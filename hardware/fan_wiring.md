# Fan & Relay Wiring Guide

This guide explains how to connect a DC Fan to your ESP8266 (NodeMCU) using a Relay Module.

## Components Needed
*   **ESP8266 (NodeMCU)**
*   **Relay Module** (1-channel, 5V or 3.3V compatible)
*   **DC Fan** (e.g., 12V or 5V, depending on your battery)
*   **Battery/Power Source** for the Fan (e.g., 9V or 12V battery)
*   **Jumper Wires**

## Pin Definitions
Based on your `main.ino`:
*   **Fan Control Pin**: `D6` (GPIO 12)

## Wiring Diagram

### 1. Control Circuit (ESP8266 -> Relay)
Connect the Relay Module to the ESP8266:

| Relay Pin | ESP8266 Pin | Description |
| :--- | :--- | :--- |
| **VCC** | **3V3** or **VIN** | Power for the Relay (3.3V or 5V) |
| **GND** | **GND** | Ground |
| **IN** (Signal) | **D6** | Control Signal from code |

### 2. Power Circuit (Battery -> Relay -> Fan)
**WARNING**: Do NOT connect the Fan directly to the ESP8266. It needs its own power source.

1.  **Battery (+) Positive** -> Connect to **COM** (Common) port on Relay.
2.  **Relay NO** (Normally Open) -> Connect to **Fan (+) Red Wire**.
3.  **Fan (-) Black Wire** -> Connect to **Battery (-) Negative**.

```mermaid
graph TD
    subgraph ESP8266
    D6[Pin D6]
    GND_ESP[GND]
    VCC_ESP[3V3/VIN]
    end

    subgraph Relay_Module
    IN[IN]
    VCC_RELAY[VCC]
    GND_RELAY[GND]
    COM[COM]
    NO[NO]
    end

    subgraph High_Power_Circuit
    BAT_POS[Battery (+)]
    BAT_NEG[Battery (-)]
    FAN_POS[Fan (+)]
    FAN_NEG[Fan (-)]
    end

    D6 --> IN
    VCC_ESP --> VCC_RELAY
    GND_ESP --> GND_RELAY
    
    BAT_POS --> COM
    NO --> FAN_POS
    FAN_NEG --> BAT_NEG
```

## How it Works
1.  **Code Logic**: When `crateTemp` > 9.0°C, Pin **D6** goes HIGH (3.3V).
2.  **Relay Logic**: The Relay receives the signal on **IN**. It "clicks" and closes the internal switch between **COM** and **NO**.
3.  **Fan Power**: The circuit completes, allowing current to flow from the Battery, through the Relay, to the Fan.
4.  **Fan Turns ON**.

## Troubleshooting
*   **Relay LED doesn't light up?** Check connections between ESP and Relay. Ensure `main.ino` has `FAN_ACTIVE_HIGH = true` (default).
*   **Fan is ON when it should be OFF?** Your relay might be "Active LOW". Change line 69 in `main.ino`:
    ```cpp
    const bool FAN_ACTIVE_HIGH = false; // Change to false for Active LOW relays
    ```
