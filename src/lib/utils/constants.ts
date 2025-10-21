// src/lib/utils/constants.ts

// ثوابت اللغة والاتجاه
export const LOCALE = 'ar-SA' as const
export const DIR = 'rtl' as const

// أيام الأسبوع بالعربية مع المختصرات
export const ARABIC_DAYS = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
] as const

export const ARABIC_DAYS_SHORT: Record<(typeof ARABIC_DAYS)[number], string> = {
  'السبت': 'سبت',
  'الأحد': 'أحد',
  'الاثنين': 'اثنين',
  'الثلاثاء': 'ثلاثاء',
  'الأربعاء': 'أربعاء',
  'الخميس': 'خميس',
  'الجمعة': 'جمعة',
}

// الفترات الزمنية
export const PERIODS = {
  MORNING: 'صباحي',
  EVENING: 'مسائي',
} as const
export type PeriodKey = keyof typeof PERIODS
export type PeriodValue = (typeof PERIODS)[PeriodKey]

// خانات الأوقات (قابلة للتعديل لاحقاً من الإعدادات)
export const MORNING_TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00',
] as const

export const EVENING_TIME_SLOTS = [
  '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00',
] as const

// سعات التشغيل الافتراضية
export const DEFAULT_CAPACITY = {
  MORNING: 15,
  EVENING: 18,
  DAILY: 33,
} as const

// إعدادات الاشتراك الافتراضية
export const DEFAULT_SUBSCRIPTION = {
  MONTHLY_PRICE: 80,
  TOTAL_WASHES: 10,
  PAID_WASHES: 8,
  FREE_WASHES: 2,
  PRICE_PER_WASH: 10,
  DAYS_BETWEEN_WASHES: 3,
} as const

// تعريف ألوان الحالات
export const STATUS_COLORS = {
  'قادم': '#3B82F6',        // أزرق
  'جاري': '#F59E0B',        // برتقالي
  'مكتمل': '#10B981',       // أخضر
  'غائب': '#EF4444',        // أحمر
  'معاد جدولته': '#8B5CF6', // بنفسجي
  'ملغي': '#6B7280',        // رمادي
} as const
export type AppointmentStatusKey = keyof typeof STATUS_COLORS

// مفاتيح التخزين المحلي
export const STORAGE_KEYS = {
  CUSTOMERS: 'carwash_customers',
  APPOINTMENTS: 'carwash_appointments',
  SETTINGS: 'carwash_settings',
  LOGS: 'carwash_logs',
  WAITING_LIST: 'carwash_waiting',
} as const

// ثوابت التواريخ
export const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD', // للاستخدام الدلالي في النظام
  TIME_24H: 'HH:mm',
} as const

// أنماط التحقق الأساسية
export const REGEX = {
  SA_MOBILE: /^05\d{8}$/, // رقم جوال سعودي 10 خانات يبدأ بـ 05
} as const

// قوائم اختيار قياسية
export const CAR_SIZES = ['صغيرة', 'كبيرة'] as const
export const PERIOD_OPTIONS = [PERIODS.MORNING, PERIODS.EVENING, 'مرن'] as const

// تهيئة واجهات العرض (Tailwind/ألوان) - للاتساق البصري
export const THEME = {
  colors: {
    primary: '#3B82F6',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#06B6D4',
    gray600: '#4B5563',
    gray700: '#374151',
  },
} as const

// رسائل واجهة مستخدم افتراضية
export const UI_MESSAGES = {
  SUCCESS_SAVE: '✅ تم الحفظ بنجاح',
  SUCCESS_ADD: '✅ تم الإضافة بنجاح',
  SUCCESS_UPDATE: '✅ تم التحديث بنجاح',
  SUCCESS_DELETE: '✅ تم الحذف بنجاح',
  ERROR_GENERIC: '⚠️ حدث خطأ غير متوقع',
  CONFIRM_DELETE: 'هل أنت متأكد من الحذف؟ هذا الإجراء لا يمكن التراجع عنه.',
} as const

// ثوابت الطوارئ
export const EMERGENCY_THRESHOLDS = {
  BULK_ABSENCE_MIN: 5,       // حد اعتبار الغياب جماعياً
  WAITLIST_EXPIRY_HOURS: 24, // صلاحية عرض الموعد المتاح لسجل الانتظار
  MAX_MISSED_BEFORE_SUSPEND: 5,
} as const

// ثوابت عامة للاستخدام في الحسابات الزمنية
export const TIME_IN_SECONDS = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
} as const

// قيود عامة
export const LIMITS = {
  MAX_APPOINTMENTS_PER_DAY: DEFAULT_CAPACITY.DAILY,
  MAX_MORNING: DEFAULT_CAPACITY.MORNING,
  MAX_EVENING: DEFAULT_CAPACITY.EVENING,
  MIN_GAP_DAYS_BETWEEN_WASHES: DEFAULT_SUBSCRIPTION.DAYS_BETWEEN_WASHES,
} as const
