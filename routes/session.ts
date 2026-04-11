import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import connectToDatabase from "../lib/db.js";
import Session from "../models/Session.js";
import { getCurrentShift } from "../lib/shiftState.js";
import { pickPuzzlesForShift, TOTAL_PUZZLES } from "../lib/sessionPuzzles.js";
import {
  SHIFT_MILESTONES,
  SHIFT_TOTAL_COMPONENTS,
  computeComponentsEarned,
} from "../data/componentMilestones.js";

const router = Router();

// A. POST /api/session/start
router.post("/start", async (req, res) => {
  try {
    await connectToDatabase();
    const { teamName, teamLeadName } = req.body ?? {};
    if (!teamName || !teamLeadName) {
      return res.status(400).json({ success: false, message: "Team name and team lead name are required" });
    }

    let session = await Session.findOne({ teamName });

    if (!session) {
      const shift = getCurrentShift();
      const selectedPuzzles = pickPuzzlesForShift(shift);

      session = new Session({
        sessionId: uuidv4(),
        teamName,
        teamLeadName,
        shift,
        worldWidth: 3000,
        worldHeight: 3000,
        playerStart: { x: 1500, y: 1500 },
        puzzles: selectedPuzzles,
        inventory: [{ itemId: "wire", quantity: 99 }],
        placedItems: [],
        solvedPuzzleIds: [],
        puzzleSolveTimestamps: {},
        circuitCorrect: false,
        circuitCompletedAt: null,
      });
      await session.save();
    }

    const sessionObj = session.toObject();
    // Client: puzzle ids only for zones; question links via POST /puzzle/get when player opens a puzzle.
    const { puzzles, ...safeSession } = sessionObj;
    safeSession.assignedPuzzleIds = (puzzles as { id: string }[]).map((p) => p.id);

    // Progress data
    const solvedCount = session.solvedPuzzleIds.length;
    const totalComponents = SHIFT_TOTAL_COMPONENTS[session.shift] ?? 0;
    const componentsEarned = computeComponentsEarned(session.shift, solvedCount);

    safeSession.solvedCount = solvedCount;
    safeSession.totalPuzzles = TOTAL_PUZZLES;
    safeSession.totalComponents = totalComponents;
    safeSession.componentsEarned = componentsEarned;
    safeSession.circuitCorrect = !!(session as any).circuitCorrect;

    res.status(200).json({ success: true, data: safeSession });
  } catch (error) {
    console.error("Error starting session:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// B. POST /api/session/update
router.post("/update", async (req, res) => {
  try {
    await connectToDatabase();
    const { sessionId, placedItems, inventory, solvedPuzzleIds } = req.body;
    
    if (!sessionId || !placedItems) {
      return res.status(400).json({ success: false, message: "Missing sessionId or placedItems" });
    }

    const $set: Record<string, unknown> = { placedItems };
    if (Array.isArray(inventory)) {
      $set.inventory = inventory;
    }
    if (Array.isArray(solvedPuzzleIds)) {
      $set.solvedPuzzleIds = solvedPuzzleIds;
    }

    const session = await Session.findOneAndUpdate(
      { sessionId },
      { $set },
      { returnDocument: 'after' }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// C. POST /api/session/puzzle/get — question link when player opens a zone (e.g. press E). Never exposes correctAnswer.
router.post("/puzzle/get", async (req, res) => {
  try {
    await connectToDatabase();
    const { sessionId, puzzleId } = req.body;

    if (!sessionId || !puzzleId) {
      return res.status(400).json({ success: false, message: "Missing sessionId or puzzleId" });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const puzzle = session.puzzles.find((p: any) => p.id === puzzleId);
    if (!puzzle) {
      return res.status(404).json({ success: false, message: "Puzzle not found in this session" });
    }

    const alreadySolved = session.solvedPuzzleIds.includes(puzzleId);

    res.status(200).json({
      success: true,
      puzzleId: puzzle.id,
      question: puzzle.question,
      solved: alreadySolved,
    });
  } catch (error) {
    console.error("Error getting puzzle:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// D. POST /api/session/puzzle/verify — checks answer server-side only; response never includes the answer.
// Reward components are now granted via milestone system, not per-puzzle rewardItems.
router.post("/puzzle/verify", async (req, res) => {
  try {
    await connectToDatabase();
    const { sessionId, puzzleId, answer } = req.body;

    if (!sessionId || !puzzleId || answer === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
       return res.status(404).json({ success: false, message: "Session not found" });
    }

    const puzzle = session.puzzles.find((p: any) => p.id === puzzleId);
    if (!puzzle) {
       return res.status(404).json({ success: false, message: "Puzzle not found or not assigned to session" });
    }

    if (session.solvedPuzzleIds.includes(puzzleId)) {
        return res.status(400).json({ success: false, message: "Puzzle already solved" });
    }

    const isCorrect = puzzle.correctAnswer.toLowerCase().trim() === answer.toLowerCase().trim();

    if (!isCorrect) {
        return res.status(200).json({ success: false, message: "Incorrect answer" });
    }

    // Correct! Update solved puzzles and timestamp
    session.solvedPuzzleIds.push(puzzleId);
    if (!session.puzzleSolveTimestamps) {
      session.puzzleSolveTimestamps = {};
    }
    (session.puzzleSolveTimestamps as any)[puzzleId] = new Date();

    // Milestone-based rewards: check if the new solvedCount triggers a milestone
    const newSolvedCount = session.solvedPuzzleIds.length;
    const milestones = SHIFT_MILESTONES[session.shift] ?? {};
    const milestoneRewards = milestones[newSolvedCount] ?? [];

    // Add milestone rewards to inventory
    for (const reward of milestoneRewards) {
      const existingItem = session.inventory.find(
        (i: { itemId: string }) => i.itemId === reward.itemId,
      );
      if (existingItem) {
        existingItem.quantity += reward.quantity;
      } else {
        session.inventory.push({ itemId: reward.itemId, quantity: reward.quantity });
      }
    }

    session.markModified("inventory");
    session.markModified("puzzleSolveTimestamps");
    session.markModified("solvedPuzzleIds");
    await session.save();

    // Progress data
    const totalComponents = SHIFT_TOTAL_COMPONENTS[session.shift] ?? 0;
    const componentsEarned = computeComponentsEarned(session.shift, newSolvedCount);
    const componentsLeft = totalComponents - componentsEarned;

    res.status(200).json({
      success: true,
      inventory: session.inventory,
      solvedPuzzleIds: session.solvedPuzzleIds,
      solvedCount: newSolvedCount,
      totalPuzzles: TOTAL_PUZZLES,
      totalComponents,
      componentsEarned,
      componentsLeft,
      unlockedComponents: milestoneRewards, // what was just unlocked (empty array if no milestone)
      message: milestoneRewards.length > 0
        ? "Correct! New component unlocked!"
        : "Correct answer!",
    });

  } catch (error) {
    console.error("Error verifying puzzle:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// E. POST /api/session/circuit/check — whether a judge marked the circuit correct
router.post("/circuit/check", async (req, res) => {
  try {
    await connectToDatabase();
    const { sessionId } = req.body ?? {};

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Missing sessionId" });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const circuitCorrect = !!(session as any).circuitCorrect;
    res.status(200).json({
      success: true,
      circuitCorrect,
      completedAt: session.circuitCompletedAt
        ? new Date(session.circuitCompletedAt).toISOString()
        : undefined,
    });
  } catch (error) {
    console.error("Error checking circuit:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Deprecated: circuit completion is set by admin via /api/admin/session/mark-circuit
router.post("/circuit/complete", (_req, res) => {
  res.status(410).json({
    success: false,
    message:
      "Circuit approval is done by a judge in the admin panel. Use POST /api/session/circuit/check after approval.",
  });
});

// F. POST /api/session/logout
router.post("/logout", async (req, res) => {
  try {
    await connectToDatabase();
    const sessionId = req.body?.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Missing sessionId" });
    }

    res.status(200).json({ success: true, message: "Successfully logged out" });
  } catch (error) {
    console.error("Error logging out session:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
