import pool from "./src/db";
import * as fs from "fs";

async function exportDatabase() {
  try {
    const devices = await pool.query("SELECT * FROM devices");
    const readings = await pool.query("SELECT * FROM iot_readings ORDER BY created_at DESC");
    
    const data = {
      exported_at: new Date().toISOString(),
      devices: devices.rows,
      iot_readings: readings.rows
    };
    
    fs.writeFileSync("database_export.json", JSON.stringify(data, null, 2));
    console.log("Database exported to database_export.json");
    console.log(`- Devices: ${devices.rows.length} records`);
    console.log(`- IoT Readings: ${readings.rows.length} records`);
    
    process.exit(0);
  } catch (err) {
    console.error("Error exporting database:", err);
    process.exit(1);
  }
}

exportDatabase();
