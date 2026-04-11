import { allPuzzles, shift1Pool, shift2Pool } from "../data/puzzles.js";

const TOTAL_PUZZLES = 10;

/** Random puzzle set for a shift (same logic as session /start). */
export function pickPuzzlesForShift(shift: number) {
  const pool = shift === 1 ? shift1Pool : shift2Pool;
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selectedIds = shuffled.slice(0, TOTAL_PUZZLES);
  return selectedIds.map((id) => {
    const p = allPuzzles[id];
    if (!p) throw new Error(`Puzzle ${id} not found in allPuzzles`);
    return { ...p };
  });
}

export function freshSessionProgressFields() {
  return {
    inventory: [{ itemId: "wire" as const, quantity: 99 }],
    placedItems: [],
    solvedPuzzleIds: [] as string[],
    puzzleSolveTimestamps: {} as Record<string, Date>,
    circuitCorrect: false,
    circuitCompletedAt: null as Date | null,
  };
}

export { TOTAL_PUZZLES };
