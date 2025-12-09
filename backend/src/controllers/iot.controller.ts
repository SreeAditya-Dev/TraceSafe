import { Request, Response } from "express";
import pool from "../db";

function epochToTimestamptz(epochSec: number) {
  return new Date(epochSec * 1000);
}

export async function ingestReading(req: Request, res: Response) {
  /*
   expected body:
   {
     "batch_id":"TSF-23001",
     "device_role":"truck",
     "crate_temp": 12.5,
     "reefer_temp": 24.1,
     "humidity": 60.3,
     "lat": 12.34,
     "lon": 80.12,
     "fan_on": true,
     "ts": 1733225334
   }
  */
  try {
    const body = req.body;
    const {
      batch_id,
      device_role,
      crate_temp,
      reefer_temp,
      humidity,
      lat,
      lon,
      fan_on,
      ts
    } = body;

    if (!batch_id || !device_role || !ts) {
      return res.status(400).json({ error: "batch_id, device_role, ts required" });
    }
    const timest = epochToTimestamptz(Number(ts));

    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO iot_readings
        (batch_id, device_role, crate_temp, reefer_temp, humidity, lat, lon, fan_on, ts)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *;
      `;
      const r = await client.query(insertQuery, [
        batch_id,
        device_role,
        crate_temp ?? null,
        reefer_temp ?? null,
        humidity ?? null,
        lat ?? null,
        lon ?? null,
        fan_on ?? null,
        timest
      ]);

      // update devices table (last_seen)
      const upsertDev = `
        INSERT INTO devices (device_id, role, last_seen)
        VALUES ($1,$2,$3)
        ON CONFLICT (device_id) DO UPDATE SET last_seen = EXCLUDED.last_seen;
      `;
      // device_id can be batch_id+role or just role; we use batch_id as device identifier here
      await client.query(upsertDev, [batch_id, device_role, timest]);

      res.json({ ok: true, inserted: r.rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
}

export async function getBatchReadings(req: Request, res: Response) {
  const { batch_id } = req.params;
  if (!batch_id) return res.status(400).json({ error: "batch_id required" });
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT * FROM iot_readings WHERE batch_id=$1 ORDER BY ts ASC", [batch_id]);
    res.json(r.rows);
  } finally {
    client.release();
  }
}

export async function getLatestForRole(req: Request, res: Response) {
  const { device_role } = req.params;
  const client = await pool.connect();
  try {
    const r = await client.query(`SELECT * FROM iot_readings WHERE device_role=$1 ORDER BY ts DESC LIMIT 1`, [device_role]);
    res.json(r.rows[0] ?? null);
  } finally {
    client.release();
  }
}

export async function getAvgCrate(req: Request, res: Response) {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: "start & end epoch seconds required" });
  const s = new Date(Number(start) * 1000);
  const e = new Date(Number(end) * 1000);
  const client = await pool.connect();
  try {
    const q = `SELECT AVG(crate_temp) as avg_crate_temp FROM iot_readings WHERE ts >= $1 AND ts <= $2`;
    const r = await client.query(q, [s, e]);
    res.json(r.rows[0]);
  } finally {
    client.release();
  }
}

export async function getAvgReefer(req: Request, res: Response) {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: "start & end epoch seconds required" });
  const s = new Date(Number(start) * 1000);
  const e = new Date(Number(end) * 1000);
  const client = await pool.connect();
  try {
    const q = `SELECT AVG(reefer_temp) as avg_reefer_temp FROM iot_readings WHERE ts >= $1 AND ts <= $2`;
    const r = await client.query(q, [s, e]);
    res.json(r.rows[0]);
  } finally {
    client.release();
  }
}

export async function getAvgHumidity(req: Request, res: Response) {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: "start & end epoch seconds required" });
  const s = new Date(Number(start) * 1000);
  const e = new Date(Number(end) * 1000);
  const client = await pool.connect();
  try {
    const q = `SELECT AVG(humidity) as avg_humidity FROM iot_readings WHERE ts >= $1 AND ts <= $2`;
    const r = await client.query(q, [s, e]);
    res.json(r.rows[0]);
  } finally {
    client.release();
  }
}

export async function getLatestLocation(req: Request, res: Response) {
  const { batch_id } = req.params;
  if (!batch_id) return res.status(400).json({ error: "batch_id required" });
  const client = await pool.connect();
  try {
    const q = `SELECT lat, lon, ts FROM iot_readings WHERE batch_id=$1 AND lat IS NOT NULL AND lon IS NOT NULL ORDER BY ts DESC LIMIT 1`;
    const r = await client.query(q, [batch_id]);
    res.json(r.rows[0] ?? null);
  } finally {
    client.release();
  }
}

export async function getAllAverages(req: Request, res: Response) {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: "start & end epoch seconds required" });
  const s = new Date(Number(start) * 1000);
  const e = new Date(Number(end) * 1000);
  const client = await pool.connect();
  try {
    const q = `
      SELECT 
        AVG(crate_temp) as avg_crate_temp,
        AVG(reefer_temp) as avg_reefer_temp, 
        AVG(humidity) as avg_humidity
      FROM iot_readings 
      WHERE ts >= $1 AND ts <= $2
    `;
    const r = await client.query(q, [s, e]);
    res.json(r.rows[0]);
  } finally {
    client.release();
  }
}
