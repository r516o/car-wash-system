// src/lib/utils/validationUtils.ts

// التحقق من رقم جوال سعودي محلي: 10 خانات ويبدأ بـ 05
// أمثلة صحيحة: 0501234567، 0599876543
// مرجع: أرقام الجوال في السعودية 10 خانات وبادئة 05 للموبايل[1][3]
export const isValidSaudiMobile = (value: string): boolean => {
  return /^05\d{8}$/.test(value.trim())
}

// التحقق من رقم سعودي دولي: +966 5XXXXXXXX (اختياري)
export const isValidSaudiMobileIntl = (value: string): boolean => {
  // قبول +9665 ثم 8 خانات، مع أو بدون مسافات
  return /^\+966\s?5\d{8}$/.test(value.trim())
}

// التحقق الأساسي من تاريخ ISO 8601 على شكل YYYY-MM-DD
// مثال صحيح: 2025-10-21
// ISO 8601 يعتمد ترتيب السنة-الشهر-اليوم بترقيم صفري ثابت[2][6]
export const isValidISODate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00')
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}` === s
}

// التحقق من وقت 24 ساعة HH:mm وفق ISO 8601 (00:00 إلى 23:59)
// المثال: 07:30، 13:00[2]
export const isValidTime24h = (t: string): boolean => {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)
}

// التحقق من لوحة مركبة سعودية: حتى 4 أرقام + 3 أحرف عربية
// وفق الوصف: ثلاث حروف وأربعة أرقام بالعربية على اللوحات القياسية[4]
export const isValidKsaPlate = (text: string): boolean => {
  // السماح بمسافات اختيارية بين الأجزاء، أحرف عربية شائعة للوحات
  // تطابق 1-4 أرقام ثم فاصل ثم 3 أحرف عربية
  const plate = text.replace(/\s+/g, '')
  const arabicLetters = 'اأإآبجدذرزسشصضطظعغفقكلمنهوىي'
  const regex = new RegExp(`^[0-9]{1,4}[${arabicLetters}]{3}$`)
  return regex.test(plate)
}

// التحقق من صحة مجموعة أيام مفضلة: 3 أيام عربية مميزة
export const isValidPreferredDays = (days: string[]): boolean => {
  const validDays = new Set([
    'السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة',
  ])
  if (!Array.isArray(days) || days.length !== 3) return false
  const unique = new Set(days)
  if (unique.size !== 3) return false
  return days.every(d => validDays.has(d))
}

// التحقق من الفترة المفضلة
export const isValidPreferredPeriod = (period: string): boolean => {
  return period === 'صباحي' || period === 'مسائي' || period === 'مرن'
}

// التحقق من سعة اليوم: مجموع الصباحي + المسائي لا يتجاوز 33
export const isValidDailyCapacity = (morning: number, evening: number): boolean => {
  return morning >= 0 && evening >= 0 && (morning + evening) <= 33
}

// تنظيف رقم الجوال إلى تنسيق موحد (محلي)
export const normalizeSaudiMobile = (value: string): string => {
  const v = value.replace(/\s+/g, '')
  if (/^\+9665\d{8}$/.test(v)) return '0' + v.slice(4) // +9665XXXXXXXX -> 05XXXXXXXX
  if (/^009665\d{8}$/.test(v)) return '0' + v.slice(6) // 009665XXXXXXXX -> 05XXXXXXXX
  return v
}

// التحقق من مجموعة وقت ضمن الفترات المعرفة (07:00-12:00، 13:00-19:00) وفق نموذجنا
export const isWithinOperatingHours = (time: string): boolean => {
  if (!isValidTime24h(time)) return false
  const [h, m] = time.split(':').map(Number)
  const mins = h * 60 + m
  const morning = mins >= 7 * 60 && mins <= 12 * 60
  const evening = mins >= 13 * 60 && mins <= 19 * 60
  return morning || evening
}

// التحقق من سلسلة ISO datetime أساسية: YYYY-MM-DDTHH:mm
export const isValidISODateTime = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return false
  const [date, time] = s.split('T')
  return isValidISODate(date) && isValidTime24h(time)
}
