import type { FrontendItemId } from "./frontendItems.js";

/**
 * Maps `solvedCount → components to grant` for each shift.
 * Components are awarded at specific puzzle-solve milestones,
 * not per-puzzle. The total set equals the full circuit BOM.
 */
export const SHIFT_MILESTONES: Record<
  number,
  Record<number, Array<{ itemId: FrontendItemId; quantity: number }>>
> = {
  // Shift 1 — 7 components: 1 solar_cell, 2 capacitor, 1 inductor, 1 igbt, 1 diode, 1 resistor
  1: {
    1: [{ itemId: "resistor", quantity: 1 }],
    2: [{ itemId: "diode", quantity: 1 }],
    3: [{ itemId: "capacitor", quantity: 1 }],
    5: [{ itemId: "capacitor", quantity: 1 }],
    6: [{ itemId: "inductor", quantity: 1 }],
    8: [{ itemId: "igbt", quantity: 1 }],
    10: [{ itemId: "solar_cell", quantity: 1 }],
  },
  // Shift 2 — 10 components: 1 resistor, 1 dc_source, 4 diodes, 4 igbt
  2: {
    1: [{ itemId: "resistor", quantity: 1 }],
    2: [{ itemId: "diode", quantity: 1 }],
    3: [{ itemId: "igbt", quantity: 1 }],
    4: [{ itemId: "diode", quantity: 1 }],
    5: [{ itemId: "igbt", quantity: 1 }],
    6: [{ itemId: "diode", quantity: 1 }],
    7: [{ itemId: "igbt", quantity: 1 }],
    8: [{ itemId: "diode", quantity: 1 }],
    9: [{ itemId: "igbt", quantity: 1 }],
    10: [{ itemId: "dc_source", quantity: 1 }],
  },
};

/** Total circuit components (excluding wires) per shift. */
export const SHIFT_TOTAL_COMPONENTS: Record<number, number> = { 1: 7, 2: 10 };

/**
 * Compute how many components have been earned so far given a solve count and shift.
 * Sums all milestone rewards at or below the given solvedCount.
 */
export function computeComponentsEarned(shift: number, solvedCount: number): number {
  const milestones = SHIFT_MILESTONES[shift] ?? {};
  let earned = 0;
  for (const [threshold, rewards] of Object.entries(milestones)) {
    if (Number(threshold) <= solvedCount) {
      earned += rewards.reduce((sum, r) => sum + r.quantity, 0);
    }
  }
  return earned;
}
