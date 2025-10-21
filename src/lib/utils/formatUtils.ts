// src/lib/utils/formatUtils.ts

// إعدادات محلية افتراضية
const DEFAULT_LOCALE = 'ar-SA' as const
const DEFAULT_CURRENCY = 'SAR' as const
const DEFAULT_TZ = 'Asia/Riyadh' as const

// تنسيق الأعداد
export const formatNumber = (
  value: number,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string => {
  return new Intl.NumberFormat(locale, options).format(value)
}

// تنسيق العملة (ريال سعودي)
export const formatCurrency = (
  value: number,
  locale: string = DEFAULT_LOCALE,
  currency: string = DEFAULT_CURRENCY,
  options: Intl.NumberFormatOptions = {}
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    ...options,
  }).format(value)
}

// تنسيق نسبة مئوية
export const formatPercent = (
  value: number,
  locale: string = DEFAULT_LOCALE,
  fractionDigits = 0
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

// تنسيق تاريخ (YYYY-MM-DD) إلى عرض محلي
export const formatDate = (
  isoDate: string,
  locale: string = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: '2-digit' }
): string => {
  const d = new Date(isoDate + 'T00:00:00')
  return new Intl.DateTimeFormat(locale, options).format(d)
}

// تنسيق وقت "HH:mm" إلى عرض محلي
export const formatTime = (
  hhmm: string,
  locale: string = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TZ,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string => {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(d)
}

// تنسيق تاريخ ووقت مع المنطقة الزمنية
export const formatDateTime = (
  isoDate: string,
  hhmm: string,
  locale: string = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TZ,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }
): string => {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(isoDate + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(d)
}

// استخراج خيارات Intl.DateTimeFormat الفعلية (للاختبار/التشخيص)
export const getResolvedDateTimeOptions = (
  locale: string = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TZ,
  options?: Intl.DateTimeFormatOptions
) => {
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).resolvedOptions()
}

// أداة لإظهار نطاق أرقام محلياً
export const formatNumberRange = (
  start: number,
  end: number,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string => {
  const nf = new Intl.NumberFormat(locale, options)
  // @ts-expect-error: formatRange متاحة في بيئات حديثة
  return typeof nf.formatRange === 'function' ? nf.formatRange(start, end) : `${nf.format(start)}–${nf.format(end)}`
}

// قواعد الجمع العربية باستخدام Intl.PluralRules
const pluralRulesAr = new Intl.PluralRules('ar-SA')

// اختيار مفتاح الجمع العربي المناسب
export const selectArabicPluralKey = (n: number): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' => {
  return pluralRulesAr.select(n) as any
}

// مثال توليد نص بعدد (مثل "غسلة/غسلتان/غسلات")
export const formatArabicCount = (n: number, forms: { zero?: string; one: string; two: string; few: string; many: string; other: string }): string => {
  const key = selectArabicPluralKey(n)
  switch (key) {
    case 'zero': return forms.zero ?? `0 ${forms.other}`
    case 'one': return `1 ${forms.one}`
    case 'two': return `2 ${forms.two}`
    case 'few': return `${n} ${forms.few}`
    case 'many': return `${n} ${forms.many}`
    default: return `${n} ${forms.other}`
  }
}

// تنسيق هاتف سعودي: 05XX XXX XXX
export const formatSaudiMobile = (raw: string): string => {
  const digits = raw.replace(/\D+/g, '')
  if (digits.length !== 10 || !digits.startsWith('05')) return raw
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
}
