import { Router, type Request, type Response } from "express";
import { getCurrentShift, setCurrentShift } from "../lib/shiftState.js";
import connectToDatabase from "../lib/db.js";
import Session from "../models/Session.js";
import {
  computeComponentsEarned,
  SHIFT_TOTAL_COMPONENTS,
} from "../data/componentMilestones.js";
import {
  pickPuzzlesForShift,
  freshSessionProgressFields,
  TOTAL_PUZZLES,
} from "../lib/sessionPuzzles.js";

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

async function listAllSessions(_req: Request, res: Response) {
  try {
    await connectToDatabase();
    const sessions = await Session.find().sort({ createdAt: -1 }).lean();

    const sessionsOut = sessions.map((s) => {
      const solvedCount = s.solvedPuzzleIds?.length ?? 0;
      const tsMap = (s.puzzleSolveTimestamps ?? {}) as Record<string, unknown>;
      const solveDetails: { puzzleId: string; solvedAt: string | null }[] = [];
      for (const id of s.solvedPuzzleIds ?? []) {
        const raw = tsMap[id];
        const d = raw ? new Date(raw as string | Date) : null;
        solveDetails.push({
          puzzleId: id,
          solvedAt: d && !isNaN(d.getTime()) ? d.toISOString() : null,
        });
      }

      return {
        sessionId: s.sessionId,
        teamName: s.teamName,
        teamLeadName: s.teamLeadName,
        shift: s.shift,
        solvedPuzzleIds: s.solvedPuzzleIds ?? [],
        solveDetails,
        totalPuzzles: TOTAL_PUZZLES,
        inventory: s.inventory ?? [],
        placedItems: s.placedItems ?? [],
        componentsEarned: computeComponentsEarned(s.shift, solvedCount),
        totalComponents: SHIFT_TOTAL_COMPONENTS[s.shift] ?? 0,
        circuitCorrect: !!(s as { circuitCorrect?: boolean }).circuitCorrect,
        circuitCompletedAt: s.circuitCompletedAt
          ? new Date(s.circuitCompletedAt).toISOString()
          : null,
        createdAt: (s as { createdAt?: Date }).createdAt
          ? new Date((s as { createdAt: Date }).createdAt).toISOString()
          : null,
        updatedAt: (s as { updatedAt?: Date }).updatedAt
          ? new Date((s as { updatedAt: Date }).updatedAt).toISOString()
          : null,
      };
    });

    res.status(200).json({
      success: true,
      currentShift: getCurrentShift(),
      totalSessions: sessionsOut.length,
      sessions: sessionsOut,
    });
  } catch (error) {
    console.error("Error listing sessions:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// GET /api/admin/session-list — list all teams (primary; avoids rare proxy/path issues with "sessions")
router.get("/session-list", listAllSessions);
// GET /api/admin/sessions — alias
router.get("/sessions", listAllSessions);

// POST /api/admin/session/mark-circuit
router.post("/session/mark-circuit", async (req, res) => {
  try {
    await connectToDatabase();
    const { sessionId, correct } = req.body ?? {};
    if (!sessionId || typeof correct !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "sessionId and correct (boolean) are required",
      });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (correct) {
      session.circuitCorrect = true;
      if (!session.circuitCompletedAt) {
        session.circuitCompletedAt = new Date();
      }
    } else {
      session.circuitCorrect = false;
      session.circuitCompletedAt = null;
    }

    await session.save();

    res.status(200).json({
      success: true,
      circuitCorrect: session.circuitCorrect,
      circuitCompletedAt: session.circuitCompletedAt
        ? session.circuitCompletedAt.toISOString()
        : null,
    });
  } catch (error) {
    console.error("Error marking circuit:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/admin/session/reset — reset progress, new random puzzles for same shift
router.post("/session/reset", async (req, res) => {
  try {
    await connectToDatabase();
    const { sessionId } = req.body ?? {};
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const progress = freshSessionProgressFields();
    session.puzzles = pickPuzzlesForShift(session.shift);
    session.inventory = progress.inventory;
    session.placedItems = progress.placedItems;
    session.solvedPuzzleIds = progress.solvedPuzzleIds;
    session.puzzleSolveTimestamps = progress.puzzleSolveTimestamps;
    session.circuitCorrect = progress.circuitCorrect;
    session.circuitCompletedAt = progress.circuitCompletedAt;

    session.markModified("puzzles");
    session.markModified("inventory");
    session.markModified("placedItems");
    session.markModified("solvedPuzzleIds");
    session.markModified("puzzleSolveTimestamps");
    await session.save();

    res.status(200).json({
      success: true,
      assignedPuzzleIds: session.puzzles.map((p: { id: string }) => p.id),
    });
  } catch (error) {
    console.error("Error resetting session:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/admin/session/change-shift — change shift + full reset + new puzzles
router.post("/session/change-shift", async (req, res) => {
  try {
    await connectToDatabase();
    const { sessionId, shift } = req.body ?? {};
    if (!sessionId || (shift !== 1 && shift !== 2)) {
      return res.status(400).json({
        success: false,
        message: "sessionId and shift (1 or 2) are required",
      });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const progress = freshSessionProgressFields();
    session.shift = shift;
    session.puzzles = pickPuzzlesForShift(shift);
    session.inventory = progress.inventory;
    session.placedItems = progress.placedItems;
    session.solvedPuzzleIds = progress.solvedPuzzleIds;
    session.puzzleSolveTimestamps = progress.puzzleSolveTimestamps;
    session.circuitCorrect = progress.circuitCorrect;
    session.circuitCompletedAt = progress.circuitCompletedAt;

    session.markModified("puzzles");
    session.markModified("inventory");
    session.markModified("placedItems");
    session.markModified("solvedPuzzleIds");
    session.markModified("puzzleSolveTimestamps");
    await session.save();

    res.status(200).json({
      success: true,
      shift: session.shift,
      assignedPuzzleIds: session.puzzles.map((p: { id: string }) => p.id),
    });
  } catch (error) {
    console.error("Error changing session shift:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
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

