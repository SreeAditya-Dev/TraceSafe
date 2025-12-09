import { Router } from "express";
import { ingestReading, getBatchReadings, getLatestForRole, getAvgCrate, getAvgReefer, getAvgHumidity, getLatestLocation } from "../controllers/iot.controller";

const router = Router();

router.post("/data", ingestReading);
router.get("/batch/:batch_id", getBatchReadings);
router.get("/latest/:device_role", getLatestForRole);

router.get("/avg/crate", getAvgCrate);
router.get("/avg/reefer", getAvgReefer);
router.get("/avg/humidity", getAvgHumidity);

router.get("/location/latest/:batch_id", getLatestLocation);

export default router;
