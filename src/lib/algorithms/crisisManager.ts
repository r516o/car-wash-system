// src/lib/algorithms/crisisManager.ts

export const detectCrisis = (missedToday: number) => {
  // كشف حالة طوارئ (5+ غياب)
  return missedToday >= 5
}
