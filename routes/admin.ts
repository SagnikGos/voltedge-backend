import { Router } from "express";
import { getCurrentShift, setCurrentShift } from "../lib/shiftState.js";
import connectToDatabase from "../lib/db.js";
import Session from "../models/Session.js";

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

// ─────────────────────────────────────────────────────────
// GET /api/admin/leaderboard/:shift — Leaderboard for a shift
// ─────────────────────────────────────────────────────────
// curl http://localhost:3000/api/admin/leaderboard/1 -H "x-admin-secret: voltedge2026"
// curl http://localhost:3000/api/admin/leaderboard/2 -H "x-admin-secret: voltedge2026"
router.get("/leaderboard/:shift", async (req, res) => {
  try {
    await connectToDatabase();
    const shift = parseInt(req.params.shift, 10);

    if (shift !== 1 && shift !== 2) {
      return res.status(400).json({ success: false, message: "Shift must be 1 or 2" });
    }

    const sessions = await Session.find({ shift });

    if (sessions.length === 0) {
      return res.status(200).json({
        success: true,
        shift,
        message: "No teams found for this shift.",
        totalTeams: 0,
        leaderboard: [],
      });
    }

    // Helper: format milliseconds to a human-readable duration string
    const formatDuration = (ms: number): string => {
      if (ms <= 0) return "–";
      const totalSec = Math.floor(ms / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
      if (mins > 0) return `${mins}m ${secs}s`;
      return `${secs}s`;
    };

    // Build leaderboard entries
    const entries = sessions.map((session) => {
      const solvedCount = session.solvedPuzzleIds?.length ?? 0;
      const totalPuzzles = session.puzzles?.length ?? 10;
      const circuitDone = !!session.circuitCompletedAt;

      // Get all solve timestamps
      const timestamps: Date[] = [];
      const tsMap = session.puzzleSolveTimestamps as Record<string, any> | undefined;
      if (tsMap) {
        for (const key of Object.keys(tsMap)) {
          const d = new Date(tsMap[key]);
          if (!isNaN(d.getTime())) timestamps.push(d);
        }
      }

      // Session start = the createdAt field from timestamps: true on schema
      const sessionStart = (session as any).createdAt
        ? new Date((session as any).createdAt)
        : null;

      // First & last solve times
      let firstSolve: Date | null = null;
      let lastSolve: Date | null = null;
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a.getTime() - b.getTime());
        firstSolve = timestamps[0] ?? null;
        lastSolve = timestamps[timestamps.length - 1] ?? null;
      }

      // Time taken = from sessionStart to lastSolve (or circuitCompletedAt if finished)
      let timeTakenMs = 0;
      const endTime = circuitDone ? new Date(session.circuitCompletedAt ?? Date.now()) : lastSolve;
      if (sessionStart && endTime) {
        timeTakenMs = endTime.getTime() - sessionStart.getTime();
      }

      return {
        teamName: session.teamName,
        teamLead: session.teamLeadName,
        solvedCount,
        totalPuzzles,
        circuitCompleted: circuitDone,
        circuitCompletedAt: session.circuitCompletedAt ?? null,
        timeTakenMs,
        timeTaken: formatDuration(timeTakenMs),
        sessionStart: sessionStart?.toISOString() ?? null,
        firstSolveAt: firstSolve?.toISOString() ?? null,
        lastSolveAt: lastSolve?.toISOString() ?? null,
      };
    });

    // Sort: circuit completed first → more puzzles solved → less time taken
    entries.sort((a, b) => {
      // 1. Circuit completed teams come first
      if (a.circuitCompleted !== b.circuitCompleted) {
        return a.circuitCompleted ? -1 : 1;
      }
      // 2. More puzzles solved = higher rank
      if (a.solvedCount !== b.solvedCount) {
        return b.solvedCount - a.solvedCount;
      }
      // 3. Less time taken = higher rank
      return a.timeTakenMs - b.timeTakenMs;
    });

    // Add rank
    const leaderboard = entries.map((entry, idx) => ({
      rank: idx + 1,
      ...entry,
    }));

    // Summary stats
    const circuitFinishers = entries.filter((e) => e.circuitCompleted).length;
    const avgSolved =
      entries.length > 0
        ? (entries.reduce((sum, e) => sum + e.solvedCount, 0) / entries.length).toFixed(1)
        : "0";

    res.status(200).json({
      success: true,
      shift,
      totalTeams: entries.length,
      circuitFinishers,
      averagePuzzlesSolved: avgSolved,
      generatedAt: new Date().toISOString(),
      leaderboard,
    });
  } catch (error) {
    console.error("Error generating leaderboard:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;

