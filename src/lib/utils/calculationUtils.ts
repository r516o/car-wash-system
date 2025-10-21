// src/lib/utils/calculationUtils.ts

// قسمة آمنة (تجنّب القسمة على الصفر)
export const safeDivide = (numerator: number, denominator: number, fallback = 0): number => {
  if (denominator === 0) return fallback
  return numerator / denominator
}

// نسبة مئوية من جزء إلى كل
export const percent = (part: number, total: number): number => {
  return safeDivide(part, total, 0) * 100
}

// نسبة التغير % = (الجديد - القديم) / |القديم| × 100
export const percentChange = (oldValue: number, newValue: number): number => {
  const diff = newValue - oldValue
  return safeDivide(diff, Math.abs(oldValue), 0) * 100
}

// متوسط حسابي بسيط
export const average = (values: number[]): number => {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, v) => acc + v, 0)
  return sum / values.length
}

// متوسط مرجّح = sum(w_i * x_i) / sum(w_i)
export const weightedAverage = (values: number[], weights: number[]): number => {
  if (values.length === 0 || values.length !== weights.length) return 0
  const wSum = weights.reduce((a, w) => a + w, 0)
  if (wSum === 0) return 0
  const wxSum = values.reduce((a, v, i) => a + v * weights[i], 0)
  return wxSum / wSum
}

// معدل الحضور = مكتمل / مجدول × 100
export const attendanceRate = (completed: number, scheduled: number): number => {
  return percent(completed, scheduled)
}

// نسبة الاستفادة من السعة اليومية = (مواعيد اليوم / السعة اليومية) × 100
export const capacityUtilization = (scheduledToday: number, dailyCapacity: number): number => {
  return percent(scheduledToday, dailyCapacity)
}

// تقليم ضمن نطاق [min, max]
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

// تجميع مجموعات في شرائح (Bin) لحساب توزيع بسيط
export const histogram = (values: number[], binSize: number): Record<string, number> => {
  const bins: Record<string, number> = {}
  values.forEach(v => {
    const binStart = Math.floor(v / binSize) * binSize
    const binEnd = binStart + binSize
    const key = `${binStart}-${binEnd}`
    bins[key] = (bins[key] || 0) + 1
  })
  return bins
}

// انحراف معياري مبسّط (population std)
export const stdDev = (values: number[]): number => {
  if (values.length === 0) return 0
  const avg = average(values)
  const variance = average(values.map(v => (v - avg) ** 2))
  return Math.sqrt(variance)
}

// ————— دالة هافرسين لمسافة خط عظيم بين نقطتين جغرافيتين —————
// مرجع الصيغة: haversine يحسب المسافة التقريبية على كرة بنصف قطر R[1][3]
const toRad = (deg: number): number => (deg * Math.PI) / 180

export const haversineDistanceMeters = (
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  radiusMeters = 6371000 // نصف قطر الأرض التقريبي بالمتر
): number => {
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = radiusMeters * c
  return d
}

// تحويل أمتار إلى كيلومترات
export const metersToKm = (m: number): number => m / 1000

// تقدير زمن الرحلة (ثوانٍ) من مسافة وسرعة (م/ث)
export const estimateTravelSeconds = (distanceMeters: number, speedMps: number): number => {
  if (speedMps <= 0) return 0
  return distanceMeters / speedMps
}

// تجميع قيم حسب حالة (مثلاً حالات المواعيد) لعمل إحصاء counts
export const countByKey = <T,>(items: T[], keyFn: (item: T) => string): Record<string, number> => {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}
