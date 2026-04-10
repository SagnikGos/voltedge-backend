/**
 * Item IDs accepted by the game client (`my-app` COMPONENT_DEFINITIONS keys).
 * Keep in sync with `src/data/itemDefinitions.ts` → ComponentKey.
 */
export const FRONTEND_ITEM_IDS = [
  "resistor",
  "capacitor",
  "inductor",
  "diode",
  "igbt",
  "wire",
  "dc_source",
  "solar_cell",
] as const;

export type FrontendItemId = (typeof FRONTEND_ITEM_IDS)[number];

const validSet = new Set<string>(FRONTEND_ITEM_IDS);

export function isValidFrontendItemId(id: string): id is FrontendItemId {
  return validSet.has(id);
}

/** Drops unknown itemIds and merges quantities for duplicates. */
export function sanitizeRewardItems(
  rewards: Array<{ itemId: string; quantity: number }>,
): Array<{ itemId: string; quantity: number }> {
  const merged = new Map<string, number>();
  for (const r of rewards) {
    if (!isValidFrontendItemId(r.itemId) || r.quantity <= 0) continue;
    merged.set(r.itemId, (merged.get(r.itemId) ?? 0) + r.quantity);
  }
  return [...merged.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
}
