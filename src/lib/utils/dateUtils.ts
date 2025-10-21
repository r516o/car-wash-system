// src/lib/utils/dateUtils.ts

// مخرجات التواريخ بصيغة ISO 8601: YYYY-MM-DD ووقت HH:mm (24h)

// تحويل Date إلى YYYY-MM-DD
export const toISODate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// اليوم الحالي ISO
export const getTodayISO = (): string => toISODate(new Date())

// إضافة أيام وإرجاع ISO
export const addDaysISO = (isoDate: string, days: number): string => {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// إضافة أيام على كائن Date
export const addDays = (d: Date, days: number): Date => {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + days)
  return nd
}

// مقارنة تواريخ ISO (دون وقت)
export const compareISO = (a: string, b: string): number => {
  if (a === b) return 0
  return a < b ? -1 : 1
}

// هل نفس اليوم؟
export const isSameISO = (a: string, b: string): boolean => a === b

// اسم اليوم بالعربية من Date.getDay()
const AR_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'] as const
export type ArabicDay = (typeof AR_DAYS)[number]

export const getArabicDayName = (d: Date): ArabicDay => AR_DAYS[d.getDay()]

// تحويل YYYY-MM-DD إلى Date
export const fromISODate = (iso: string): Date => new Date(iso + 'T00:00:00')

// استخراج رقم الأسبوع ISO تقريبياً (Mon-based)
export const getISOWeek = (isoDate: string): number => {
  // خوارزمية مبسطة لحساب رقم الأسبوع
  const d = fromISODate(isoDate)
  // نقل إلى خميس الأسبوع نفسه
  const dayNum = (d.getDay() + 6) % 7 // 0=Mon
  d.setDate(d.getDate() - dayNum + 3)
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  const firstDayNum = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3)
  const diff = d.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
}

// توليد جميع أيام شهر معين (1..12)
export const generateMonthDates = (year: number, month: number): string[] => {
  const dates: string[] = []
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0) // آخر يوم في الشهر
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(toISODate(d))
  }
  return dates
}

// اليوم التالي المطابق لأحد الأيام المفضلة
export const nextPreferredDay = (
  startISO: string,
  preferredDays: ArabicDay[]
): string => {
  let d = fromISODate(startISO)
  for (let i = 0; i < 14; i++) { // ابحث لأسبوعين
    const name = getArabicDayName(d)
    if (preferredDays.includes(name)) return toISODate(d)
    d = addDays(d, 1)
  }
  return toISODate(d)
}

// تحويل "HH:mm" إلى دقائق منذ منتصف الليل
export const timeToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// تحويل دقائق إلى "HH:mm"
export const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// التحقق من صحة "YYYY-MM-DD" وفق ISO 8601 (تحقق أساسي)
export const isValidISODate = (s: string): boolean => {
  // نمط أساسي: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = fromISODate(s)
  return toISODate(d) === s
}

// الحصول على اسم اليوم بالعربية من ISO
export const getArabicDayNameFromISO = (iso: string): ArabicDay =>
  getArabicDayName(fromISODate(iso))

// بداية اليوم ونهايته ISO مع وقت
export const startOfDayISO = (isoDate: string): string => `${isoDate}T00:00:00`
export const endOfDayISO = (isoDate: string): string => `${isoDate}T23:59:59`

// الحصول على (السنة، الشهر) من ISO
export const splitISO = (isoDate: string): { year: number; month: number; day: number } => {
  const [y, m, d] = isoDate.split('-').map(Number)
  return { year: y, month: m, day: d }
}
