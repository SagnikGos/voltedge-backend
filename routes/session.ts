import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import connectToDatabase from "../lib/db.js";
import Session from "../models/Session.js";
import { allPuzzles, shift1Pool, shift2Pool } from "../data/puzzles.js";
import { getCurrentShift } from "../lib/shiftState.js";

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
      const pool = shift === 1 ? shift1Pool : shift2Pool;
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const selectedIds = shuffled.slice(0, 10);
      const selectedPuzzles = selectedIds.map(id => allPuzzles[id]);

      session = new Session({
        sessionId: uuidv4(),
        teamName,
        teamLeadName,
        shift,
        worldWidth: 3000,
        worldHeight: 3000,
        playerStart: { x: 1500, y: 1500 },
        puzzles: selectedPuzzles,
        inventory: [],
        placedItems: [],
        solvedPuzzleIds: [],
        puzzleSolveTimestamps: {},
        circuitCompletedAt: null,
      });
      await session.save();
    }

    const sessionObj = session.toObject();
    // Only send puzzle IDs — no locations, no questions, no answers
    const { puzzles, ...safeSession } = sessionObj;
    safeSession.assignedPuzzleIds = puzzles.map((p: any) => p.id);

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
    const { sessionId, placedItems } = req.body;
    
    if (!sessionId || !placedItems) {
      return res.status(400).json({ success: false, message: "Missing sessionId or placedItems" });
    }

    const session = await Session.findOneAndUpdate(
      { sessionId },
      { $set: { placedItems } },
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

// C. POST /api/session/puzzle/get — reveal question when player reaches a zone
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

// D. POST /api/session/puzzle/verify
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

    // Correct! Update solved puzzles, timestamp, and add rewards to inventory
    session.solvedPuzzleIds.push(puzzleId);
    // Record solve timestamp
    if (!session.puzzleSolveTimestamps) {
      session.puzzleSolveTimestamps = {};
    }
    (session.puzzleSolveTimestamps as any)[puzzleId] = new Date();
    
    puzzle.rewardItems.forEach((reward: any) => {
        const existingItem = session.inventory.find((i: any) => i.itemId === reward.itemId);
        if (existingItem) {
            existingItem.quantity += reward.quantity;
        } else {
            session.inventory.push({ itemId: reward.itemId, quantity: reward.quantity });
        }
    });

    session.markModified("inventory");
    session.markModified("puzzleSolveTimestamps");
    session.markModified("solvedPuzzleIds");
    await session.save();

    res.status(200).json({ 
        success: true, 
        inventory: session.inventory,
        solvedPuzzleIds: session.solvedPuzzleIds,
        message: "Correct answer!"
    });

  } catch (error) {
    console.error("Error verifying puzzle:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// E. POST /api/session/circuit/complete — record circuit completion time
router.post("/circuit/complete", async (req, res) => {
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

    if (session.circuitCompletedAt) {
      return res.status(400).json({ success: false, message: "Circuit already completed", completedAt: session.circuitCompletedAt });
    }

    session.circuitCompletedAt = new Date();
    await session.save();

    res.status(200).json({
      success: true,
      message: "Circuit completed!",
      completedAt: session.circuitCompletedAt,
    });
  } catch (error) {
    console.error("Error completing circuit:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
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
