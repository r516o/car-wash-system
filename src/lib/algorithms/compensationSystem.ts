// src/lib/algorithms/compensationSystem.ts

export const calculateCompensation = (missedCount: number) => {
  // حساب التعويض المناسب
  if (missedCount >= 3) return { type: 'free_wash', count: 1 }
  return null
}
