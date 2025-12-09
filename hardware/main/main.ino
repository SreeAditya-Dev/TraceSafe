/*
 TraceSafe - ESP8266 Truck Node (Full)
 - AP provisioning (store creds in EEPROM)
 - Long-press button (>=3s) to erase creds
 - Buzzer beep on WiFi connected
 - DS18B20 (crate temp), DHT22 (ambient + humidity)
 - NEO-6M GPS (SoftwareSerial)
 - Fan control logic with hysteresis
 - JSON POST to BACKEND_URL (no auth header)
 
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
*/

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <ESP8266HTTPClient.h>

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
const float CRATE_SETPOINT_C = 8.0;
const float HYSTERESIS_C = 1.0;

// Set to true if Relay turns ON with HIGH signal (Common for small modules)
// Set to false if Relay turns ON with LOW signal (Common for optocoupler modules)
const bool RELAY_ACTIVE_HIGH = true;

// ---------------------------------------------------
ESP8266WebServer server(80);

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
  <head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
  <body>
    <h3>TraceSafe - WiFi Provisioning</h3>
    <form action="/save" method="post">
      WiFi SSID:<br><input type="text" name="ssid"><br>
      WiFi Password:<br><input type="password" name="pass"><br>
      Backend URL (http://...):<br><input type="text" name="backend"><br>
      Batch ID:<br><input type="text" name="batch"><br><br>
      <input type="submit" value="Save & Connect">
    </form>
    <p>AP IP: <span id="ip"></span></p>
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
  String backend = server.arg("backend");
  String batch = server.arg("batch");
  if (ssid.length() < 1 || backend.length() < 5) {
    server.send(400, "text/plain", "SSID and Backend required");
    return;
  }
  // save to EEPROM
  saveStringToEEPROM(EEPROM_SSID_ADDR, ssid);
  saveStringToEEPROM(EEPROM_PASS_ADDR, pass);
  saveStringToEEPROM(EEPROM_BACKEND_ADDR, backend);
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
    WiFi.begin(storedSSID.c_str(), storedPASS.c_str());
    Serial.printf("Trying WiFi (%s) ...\n", storedSSID.c_str());
    unsigned long t0 = millis();
    bool connected=false;
    while (millis() - t0 < 20000) {
      if (WiFi.status() == WL_CONNECTED) { connected=true; break; }
      delay(500);
    }
    if (connected) {
      Serial.println("WiFi connected OK: " + WiFi.localIP().toString());
      beep(2,100);
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

// fan logic
void fanLogic(){
  if (isnan(crateTemp)) return;
  float high = CRATE_SETPOINT_C + HYSTERESIS_C;
  float low = CRATE_SETPOINT_C - HYSTERESIS_C;
  if (crateTemp >= high && !fanState) setFan(true);
  else if (crateTemp <= low && fanState) setFan(false);
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

// send JSON to backend (no auth headers)
bool sendToBackend(){
  if (storedBACKEND.length() < 5) return false;
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClient client;
  HTTPClient http;
  String url = storedBACKEND; // expect http://host/api/iot/data
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  // build JSON
  unsigned long ts = (unsigned long)(millis()/1000);
  String payload = "{";
  payload += "\"batch_id\":\"" + storedBATCH + "\",";
  payload += "\"device_role\":\"truck\",";
  payload += "\"crate_temp\":" + String(crateTemp,2) + ",";
  payload += "\"reefer_temp\":" + String(ambientTemp,2) + ",";
  payload += "\"humidity\":" + String(humidityVal,2) + ",";
  payload += "\"lat\":" + String(lastLat, 6) + ",";
  payload += "\"lon\":" + String(lastLng, 6) + ",";
  payload += "\"fan_on\":" + String(fanState ? "true" : "false") + ",";
  payload += "\"ts\":" + String(ts);
  payload += "}";
  int code = http.POST(payload);
  Serial.printf("POST %s -> %d\n", url.c_str(), code);
  String resp = http.getString();
  Serial.println("Resp: " + resp);
  http.end();
  return (code >=200 && code <300);
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

  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    readSensors();
    fanLogic();
    lastSensorRead = now;
  }

  if (now - lastSend >= SEND_INTERVAL_MS) {
    bool ok = sendToBackend();
    if (!ok) Serial.println("Send failed or no backend configured");
    lastSend = now;
  }

  delay(100);
}
