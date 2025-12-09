/*
 TraceSafe - ESP8266 Truck Node (Full)
 - AP provisioning (store creds in EEPROM)
 - Long-press button (>=3s) to erase creds
 - Buzzer beep on WiFi connected
 - DS18B20 (crate temp), DHT22 (ambient + humidity)
 - NEO-6M GPS (SoftwareSerial)
 - Fan control logic with hysteresis
 - JSON POST to BACKEND_URL (no auth header)
 - NTP time sync for accurate timestamps
 
 Wiring (NodeMCU labels / recommended pins):
  DS18B20 data -> D1 (GPIO5)
  DHT22 data    -> D2 (GPIO4)
  GPS TX        -> D7 (GPIO13)  [GPS TX -> ESP RX of software serial]
  GPS RX        -> D8 (GPIO15)  [optional]

  RELAY/FAN     -> D6 (GPIO12)  [Connect to Relay IN]
  BUTTON        -> D3 (GPIO0)   (use internal pullup)

  BUZZER        -> D4 (GPIO2)
  4.7kΩ between DS18B20 data and 3.3V

 Libraries required:
   - ESP8266WiFi
   - ESP8266WebServer
   - EEPROM
   - ESP8266HTTPClient
   - OneWire
   - DallasTemperature
   - DHT
   - TinyGPSPlus
   - SoftwareSerial
   - NTPClient (for time sync)
*/

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <ESP8266HTTPClient.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <time.h>

#include <OneWire.h>
#include <DallasTemperature.h>
#include "DHT.h"
#include <TinyGPSPlus.h>
#include <SoftwareSerial.h>

// ---------------- USER CONFIGURABLE ----------------
#define EEPROM_SIZE 1024
#define EEPROM_SSID_ADDR 0        // allocated blocks (we'll store strings with separators)
#define EEPROM_PASS_ADDR 200
#define EEPROM_BACKEND_ADDR 500
#define EEPROM_BATCH_ADDR 800

// default intervals
const unsigned long SENSOR_READ_INTERVAL_MS = 30UL * 1000UL;
const unsigned long SEND_INTERVAL_MS = 60UL * 1000UL;

// pins (NodeMCU Dx labels)
#define DS18B20_PIN D1   // GPIO5
#define DHT_PIN     D2   // GPIO4
#define GPS_RX_PIN  D7   // GPIO13 (GPS TX -> ESP software RX)
#define GPS_TX_PIN  D8   // GPIO15 (optional)

#define RELAY_PIN   D6   // GPIO12 (Connect to Relay Module IN pin)
#define BUTTON_PIN  D3   // GPIO0 (with internal pullup)

#define BUZZER_PIN  D4   // GPIO2

#define DHTTYPE DHT22

// fan control thresholds
const float CRATE_SETPOINT_C = 26.0;
const float HYSTERESIS_C = 1.0;

// Set to true if Relay turns ON with HIGH signal (Common for small modules)
// Set to false if Relay turns ON with LOW signal (Common for optocoupler modules)
const bool RELAY_ACTIVE_HIGH = true;

// NTP Configuration
const char* NTP_SERVER = "pool.ntp.org";
const long UTC_OFFSET_SEC = 0;  // UTC timezone, adjust if needed (e.g., 19800 for IST +5:30)
const int NTP_UPDATE_INTERVAL_MS = 60000; // Update NTP every 60 seconds

// ---------------------------------------------------
ESP8266WebServer server(80);

// NTP Client
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, NTP_SERVER, UTC_OFFSET_SEC, NTP_UPDATE_INTERVAL_MS);
bool ntpInitialized = false;

OneWire oneWire(DS18B20_PIN);
DallasTemperature sensors(&oneWire);
DHT dht(DHT_PIN, DHTTYPE);
SoftwareSerial gpsSerial(GPS_RX_PIN, GPS_TX_PIN); // RX, TX
TinyGPSPlus gps;

// runtime
String storedSSID = "";
String storedPASS = "";
String storedBACKEND = "";
String storedBATCH = "";

unsigned long lastSensorRead = 0;
unsigned long lastSend = 0;

float crateTemp = NAN;
float ambientTemp = NAN;
float humidityVal = NAN;
double lastLat = 0.0;
double lastLng = 0.0;
bool fanState = false;

// helper prototypes
void startAP();
void handleRoot();
void handleSave();
void loadFromEEPROM();
void saveStringToEEPROM(int addr, const String &str);
String readStringFromEEPROM(int addr, int maxLen);
void eraseCreds();
void setFan(bool on);
void fanLogic();
void readSensors();
void readGPS();
void beep(int times, int toneMs = 120);
bool sendToBackend();
void setupServerRoutes();
bool buttonLongPressed();
void initNTP();
unsigned long getEpochTime();
bool checkWiFiConnection();

// ---------------- EEPROM helpers ----------------
void saveStringToEEPROM(int addr, const String &str) {
  int len = str.length();
  EEPROM.write(addr, len & 0xFF);
  EEPROM.write(addr+1, (len>>8) & 0xFF);
  for (int i=0;i<len;i++){
    EEPROM.write(addr+2+i, str[i]);
  }
  EEPROM.commit();
}
String readStringFromEEPROM(int addr, int maxLen) {
  int lo = EEPROM.read(addr);
  int hi = EEPROM.read(addr+1);
  int len = lo | (hi<<8);
  if (len <=0 || len > maxLen) return "";
  char buf[len+1];
  for (int i=0;i<len;i++){
    buf[i] = EEPROM.read(addr+2+i);
  }
  buf[len]=0;
  return String(buf);
}

void loadFromEEPROM(){
  storedSSID = readStringFromEEPROM(EEPROM_SSID_ADDR, 180);
  storedPASS = readStringFromEEPROM(EEPROM_PASS_ADDR, 180);
  storedBACKEND = readStringFromEEPROM(EEPROM_BACKEND_ADDR, 260);
  if (storedBACKEND.length() < 5) storedBACKEND = "http://172.16.45.33:3000/api/iot/data";
  storedBATCH = readStringFromEEPROM(EEPROM_BATCH_ADDR, 120);
}

// erase credentials
void eraseCreds(){
  // write zero lengths
  EEPROM.write(EEPROM_SSID_ADDR, 0);
  EEPROM.write(EEPROM_SSID_ADDR+1, 0);
  EEPROM.write(EEPROM_PASS_ADDR, 0);
  EEPROM.write(EEPROM_PASS_ADDR+1, 0);
  EEPROM.write(EEPROM_BACKEND_ADDR, 0);
  EEPROM.write(EEPROM_BACKEND_ADDR+1, 0);
  EEPROM.write(EEPROM_BATCH_ADDR, 0);
  EEPROM.write(EEPROM_BATCH_ADDR+1, 0);
  EEPROM.commit();
  storedSSID = storedPASS = storedBACKEND = storedBATCH = "";
}

// ---------------- AP Web Form ----------------
const char* FORM_HTML = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TraceSafe Setup</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
    h3 { margin-top: 0; margin-bottom: 1.5rem; color: #1a1a1a; text-align: center; font-weight: 600; }
    label { display: block; margin-bottom: 0.5rem; color: #4a5568; font-size: 0.9rem; font-weight: 500; }
    input[type=text], input[type=password] { width: 100%; padding: 12px; margin-bottom: 1.2rem; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 1rem; transition: border-color 0.2s; }
    input[type=text]:focus, input[type=password]:focus { border-color: #3182ce; outline: none; }
    input[type=submit] { width: 100%; background-color: #3182ce; color: white; padding: 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 600; transition: background-color 0.2s; }
    input[type=submit]:hover { background-color: #2b6cb0; }
    .footer { text-align: center; margin-top: 1.5rem; color: #718096; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="card">
    <h3>TraceSafe Setup</h3>
    <form action="/save" method="post">
      <label>WiFi SSID</label>
      <input type="text" name="ssid" placeholder="Network Name" required>
      
      <label>WiFi Password</label>
      <input type="password" name="pass" placeholder="Password">
      
      <label>Batch ID</label>
      <input type="text" name="batch" placeholder="e.g. TSF-23001">
      
      <input type="submit" value="Save & Connect">
    </form>
    <div class="footer">AP IP: <span id="ip"></span></div>
  </div>
  <script>document.getElementById('ip').innerText = location.hostname;</script>
</body>
</html>
)rawliteral";

void handleRoot(){
  server.sendHeader("Cache-Control","no-cache, no-store, must-revalidate");
  server.send(200, "text/html", FORM_HTML);
}

void handleSave(){
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Only POST");
    return;
  }
  String ssid = server.arg("ssid");
  String pass = server.arg("pass");
  // Backend URL is handled by default in code, not user input
  String batch = server.arg("batch");
  
  if (ssid.length() < 1) {
    server.send(400, "text/plain", "SSID required");
    return;
  }
  // save to EEPROM
  saveStringToEEPROM(EEPROM_SSID_ADDR, ssid);
  saveStringToEEPROM(EEPROM_PASS_ADDR, pass);
  // Do not overwrite backend addr
  saveStringToEEPROM(EEPROM_BATCH_ADDR, batch);
  server.send(200, "text/plain", "Saved. Restarting...");
  delay(1000);
  ESP.restart();
}

// ---------------- setup / loop ----------------
void setup() {
  Serial.begin(115200);
  delay(100);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  // Ensure buzzer is off at boot
  digitalWrite(BUZZER_PIN, LOW);
  // Ensure relay is off at boot
  if (RELAY_ACTIVE_HIGH) digitalWrite(RELAY_PIN, LOW); else digitalWrite(RELAY_PIN, HIGH);
  setFan(false);

  EEPROM.begin(EEPROM_SIZE);
  loadFromEEPROM();

  sensors.begin();
  dht.begin();
  gpsSerial.begin(9600);

  // If stored SSID empty -> create AP for provisioning
  if (storedSSID.length() < 2) {
    startAP();
  } else {
    // try to connect to WiFi
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);  // Enable auto-reconnect
    WiFi.persistent(true);        // Save WiFi config to flash
    WiFi.begin(storedSSID.c_str(), storedPASS.c_str());
    Serial.printf("Trying WiFi (%s) ...\n", storedSSID.c_str());
    unsigned long t0 = millis();
    bool connected=false;
    while (millis() - t0 < 20000) {
      if (WiFi.status() == WL_CONNECTED) { connected=true; break; }
      delay(500);
      Serial.print(".");
    }
    Serial.println();
    if (connected) {
      Serial.println("WiFi connected OK: " + WiFi.localIP().toString());
      beep(1, 80);  // Single short beep on connect (reduced from 2 beeps)
      // Initialize NTP after WiFi connection
      initNTP();
    } else {
      Serial.println("WiFi failed - open AP");
      startAP();
    }
  }
  // server routes (if AP mode)
  setupServerRoutes();
  lastSensorRead = 0;
  lastSend = 0;
}

void setupServerRoutes(){
  server.on("/", HTTP_GET, handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.begin();
}

// Start Access Point for provisioning
void startAP(){
  String apName = "TraceSafe-" + String(ESP.getChipId(), HEX);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apName.c_str(), "tracesafe"); // default password for AP; open if prefer
  IPAddress myIP = WiFi.softAPIP();
  Serial.printf("Started AP %s, IP: %s\n", apName.c_str(), myIP.toString().c_str());
  // start server for provisioning
  setupServerRoutes();
}

// beep buzzer times
void beep(int times, int toneMs){
  for (int i=0;i<times;i++){
    digitalWrite(BUZZER_PIN, HIGH);
    delay(toneMs);
    digitalWrite(BUZZER_PIN, LOW);
    delay(120);
  }
}

// toggle fan/relay
void setFan(bool on){
  fanState = on;
  if (RELAY_ACTIVE_HIGH) digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  else digitalWrite(RELAY_PIN, on ? LOW : HIGH);
}

// fan logic - turn fan ON when temperature is below 26°C
void fanLogic(){
  if (isnan(crateTemp)) return;
  float high = CRATE_SETPOINT_C + HYSTERESIS_C;  // 27°C - turn fan OFF above this
  float low = CRATE_SETPOINT_C - HYSTERESIS_C;   // 25°C - turn fan ON below this
  if (crateTemp <= low && !fanState) setFan(true);
  else if (crateTemp >= high && fanState) setFan(false);
}

// read sensors
void readSensors(){
  sensors.requestTemperatures();
  float tcrate = sensors.getTempCByIndex(0);
  if (tcrate != DEVICE_DISCONNECTED_C) crateTemp = tcrate;
  float at = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(at)) ambientTemp = at;
  if (!isnan(h)) humidityVal = h;
  Serial.printf("Sensors -> crate: %.2f, ambient: %.2f, hum: %.2f\n", crateTemp, ambientTemp, humidityVal);
}

// read GPS
void readGPS(){
  while (gpsSerial.available()>0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }
  if (gps.location.isValid()) {
    lastLat = gps.location.lat();
    lastLng = gps.location.lng();
  }
}

// Initialize NTP time client
void initNTP() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("Initializing NTP...");
  timeClient.begin();
  
  // Try to get time with retries
  int retries = 0;
  while (!timeClient.update() && retries < 5) {
    timeClient.forceUpdate();
    delay(500);
    retries++;
  }
  
  if (timeClient.isTimeSet()) {
    ntpInitialized = true;
    Serial.printf("NTP time synced: %lu (epoch)\n", timeClient.getEpochTime());
  } else {
    Serial.println("NTP sync failed - will use server time");
    ntpInitialized = false;
  }
}

// Get current epoch time (returns 0 if not available, backend will use server time)
unsigned long getEpochTime() {
  if (!ntpInitialized) return 0;
  
  // Update NTP periodically
  timeClient.update();
  
  unsigned long epochTime = timeClient.getEpochTime();
  // Sanity check - epoch should be after year 2020 (1577836800)
  if (epochTime < 1577836800) {
    return 0;  // Return 0 to signal invalid time
  }
  return epochTime;
}

// Check and maintain WiFi connection
bool checkWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }
  
  Serial.println("WiFi disconnected, attempting reconnect...");
  WiFi.disconnect();
  delay(100);
  WiFi.begin(storedSSID.c_str(), storedPASS.c_str());
  
  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi reconnected: " + WiFi.localIP().toString());
    // Re-init NTP after reconnection
    if (!ntpInitialized) {
      initNTP();
    }
    return true;
  }
  
  Serial.println("WiFi reconnection failed");
  return false;
}

// send JSON to backend (no auth headers)
bool sendToBackend(){
  // Check backend string
  if (storedBACKEND.length() < 5) {
    Serial.println("Backend URL not configured");
    return false;
  }
  
  // Check WiFi connection
  if (!checkWiFiConnection()) {
    Serial.println("No WiFi connection");
    return false;
  }
  
  String url = storedBACKEND;
  
  // Get proper epoch timestamp from NTP (or 0 if not available - backend will use server time)
  unsigned long ts = getEpochTime();
  
  // Build JSON payload
  String payload = "{";
  payload += "\"batch_id\":\"" + storedBATCH + "\",";
  payload += "\"device_role\":\"truck\",";
  
  // Handle NaN values properly
  if (!isnan(crateTemp)) {
    payload += "\"crate_temp\":" + String(crateTemp, 2) + ",";
  } else {
    payload += "\"crate_temp\":null,";
  }
  
  if (!isnan(ambientTemp)) {
    payload += "\"reefer_temp\":" + String(ambientTemp, 2) + ",";
  } else {
    payload += "\"reefer_temp\":null,";
  }
  
  if (!isnan(humidityVal)) {
    payload += "\"humidity\":" + String(humidityVal, 2) + ",";
  } else {
    payload += "\"humidity\":null,";
  }
  
  payload += "\"lat\":" + String(lastLat, 6) + ",";
  payload += "\"lon\":" + String(lastLng, 6) + ",";
  payload += "\"fan_on\":" + String(fanState ? "true" : "false") + ",";
  
  // Only include ts if we have valid NTP time, otherwise let backend use server time
  if (ts > 0) {
    payload += "\"ts\":" + String(ts);
  } else {
    payload += "\"ts\":null";  // Backend will use current server time
  }
  payload += "}";

  Serial.println("Sending payload: " + payload);
  Serial.println("To URL: " + url);

  int code = -1;
  // Try up to 3 times
  for (int i = 0; i < 3; i++) {
    WiFiClient client;
    HTTPClient http;
    
    // Configure HTTP client
    http.setReuse(false);  // Don't reuse connections
    
    if (!http.begin(client, url)) {
      Serial.printf("POST Attempt %d: http.begin() failed\n", i + 1);
      delay(1000);
      continue;
    }
    
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(10000);  // 10s timeout (increased from 3s)
    
    code = http.POST(payload);
    
    if (code >= 200 && code < 300) {
      Serial.printf("POST %s -> %d\n", url.c_str(), code);
      String resp = http.getString();
      Serial.println("Resp: " + resp);
      http.end();
      return true; // Success
    } else if (code > 0) {
      // Got a response but not success
      Serial.printf("POST Attempt %d failed: HTTP %d\n", i + 1, code);
      String resp = http.getString();
      Serial.println("Error response: " + resp);
    } else {
      // Connection error
      Serial.printf("POST Attempt %d failed: code %d (%s)\n", i + 1, code, http.errorToString(code).c_str());
    }
    
    http.end();
    delay(2000); // Wait 2s before retry
  }
  return false;
}

// check if long pressed
bool buttonLongPressed(){
  if (digitalRead(BUTTON_PIN) == LOW) {
    unsigned long tStart = millis();
    while (digitalRead(BUTTON_PIN) == LOW) {
      if (millis() - tStart > 3000) return true;
      delay(10);
    }
  }
  return false;
}

void loop() {
  // handle webserver if AP mode
  server.handleClient();

  // check button long press to erase creds
  if (buttonLongPressed()) {
    Serial.println("Long press detected -> Erasing stored WiFi/Backend/BATCH");
    eraseCreds();
    beep(4,80);
    delay(500);
    ESP.restart();
    return;
  }

  // read GPS frequently
  readGPS();

  // Update NTP time periodically when connected
  if (ntpInitialized && WiFi.status() == WL_CONNECTED) {
    timeClient.update();
  }

  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    readSensors();
    fanLogic();
    lastSensorRead = now;
  }

  if (now - lastSend >= SEND_INTERVAL_MS) {
    // Only attempt to send if we have WiFi
    if (checkWiFiConnection()) {
      bool ok = sendToBackend();
      if (!ok) {
        Serial.println("Send failed after all retries");
      }
    } else {
      Serial.println("Skipping send - no WiFi connection");
    }
    lastSend = now;
  }

  delay(100);
}
