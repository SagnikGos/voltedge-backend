import { Router } from "express";
import { getCurrentShift, setCurrentShift } from "../lib/shiftState.js";

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET || "voltedge2026";

// Middleware: check password on all admin routes
router.use((req, res, next) => {
  const password = req.headers["x-admin-secret"] || req.body?.password;
  if (password !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
});

// GET /api/admin/shift — check current shift
router.get("/shift", (req, res) => {
  res.status(200).json({ success: true, currentShift: getCurrentShift() });
});

// POST /api/admin/shift — toggle shift (1 or 2)
router.post("/shift", (req, res) => {
  const { shift } = req.body;
  if (shift !== 1 && shift !== 2) {
    return res.status(400).json({ success: false, message: "Shift must be 1 or 2" });
  }
  setCurrentShift(shift);
  console.log(`🔄 Shift changed to: ${shift}`);
  res.status(200).json({ success: true, currentShift: shift });
});

export default router;
