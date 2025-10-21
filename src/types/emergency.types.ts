// تعريفات نظام الطوارئ وإدارة الغياب وإعادة الجدولة

import type { Period } from './appointment.types'
import type { DayOfWeek, PreferredPeriod } from './customer.types'

// أنواع حالات الطوارئ
export type EmergencyType =
  | 'غياب'
  | 'تأجيل'
  | 'إلغاء'
  | 'ازدحام'
  | 'عطل_نظام'
  | 'ظرف_قاهر'

// شدة الحالة
export type EmergencySeverity = 'منخفض' | 'متوسط' | 'مرتفع' | 'حرج'

// حالة ملف الطوارئ
export type EmergencyStatus = 'مفتوح' | 'قيد_المعالجة' | 'محلول' | 'مؤرشف'

// حالة عنصر قائمة الانتظار
export type WaitingStatus = 'منتظر' | 'مقبول' | 'منتهي' | 'ملغي'

// نوع الإجراء المتخذ
export type EmergencyActionType =
  | 'إعادة_جدولة'
  | 'تعويض'
  | 'خصم'
  | 'تنبيه'
  | 'إلغاء'
  | 'إعادة_توزيع'
  | 'إعادة_تنظيم_شامل'

// سجل غياب لِموعد محدد
export interface AbsenceRecord {
  id: number
  appointmentId: number
  customerId: number
  date: string
  time: string
  period: Period
  reason?: string
  detectedAt: string // ISO
  handled: boolean
  handledAt?: string // ISO
  autoRescheduleSuggested?: boolean
  suggestion?: SuggestedSlot
}

// اقتراح موعد بديل ذكي
export interface SuggestedSlot {
  date: string // YYYY-MM-DD
  dayName: string
  time: string // HH:MM
  period: Period
  confidence: number // 0..1
  reason?: string // لماذا هذا الموعد مناسب
}

// عنصر في قائمة الانتظار
export interface WaitListEntry {
  id: number
  customerId: number
  customerName: string
  phone: string
  requestedDateRange?: {
    from?: string
    to?: string
  }
  preferredDays: DayOfWeek[]
  preferredPeriod: PreferredPeriod
  priorityScore: number // يُحسب حسب القواعد
  requestedAt: string // ISO
  expiresAt?: string // ISO
  status: WaitingStatus
  notes?: string
}

// قواعد احتساب الأولوية
export interface PriorityWeights {
  urgent: number // طلب مستعجل
  vip: number // عميل VIP
  longWaiting: number // مدة الانتظار
  oldCustomer: number // قِدم العميل
  lowBalance: number // رصيد منخفض
}

// تعريف إجراء طوارئ تم اتخاذه
export interface EmergencyAction {
  id: number
  type: EmergencyActionType
  performedBy: string // اسم المستخدم المنفذ
  performedAt: string // ISO
  details?: string
  relatedAppointmentId?: number
  relatedCustomerId?: number
  payload?: Record<string, unknown>
}

// ملف حالة طوارئ
export interface EmergencyCase {
  id: number
  type: EmergencyType
  severity: EmergencySeverity
  status: EmergencyStatus
  title: string
  description?: string
  relatedAppointments: number[] // معرفات المواعيد
  affectedCustomers: number[] // معرفات العملاء
  actions: EmergencyAction[]
  createdAt: string // ISO
  updatedAt: string // ISO
  resolvedAt?: string // ISO
  notes?: string
}

// سيناريو أزمة جاهز (Playbook)
export interface CrisisScenario {
  id: number
  name: string // مثال: غياب_جماعي_اليوم
  description: string
  triggerRules: {
    minAbsentToday?: number // مثال: 5
    capacityOverflow?: boolean
    systemFailure?: boolean
  }
  playbookSteps: Array<{
    step: number
    action: EmergencyActionType
    description: string
    auto?: boolean
  }>
}

// نتيجة إعادة جدولة جماعية
export interface BulkRescheduleResult {
  total: number
  success: number
  failed: number
  details: Array<{
    appointmentId: number
    customerId: number
    status: 'success' | 'failed'
    message?: string
    newSlot?: SuggestedSlot
  }>
}

// نتيجة إشعارات (تنبيهات) الطوارئ
export interface NotifyResult {
  total: number
  sent: number
  failed: number
  errors?: Array<{ customerId: number; message: string }>
}

// إحصائيات لوحة الطوارئ
export interface EmergencyDashboardStats {
  absentToday: number
  pendingReschedules: number
  waitingListCount: number
  openCases: number
  criticalCases: number
}

// قواعد التعويض
export interface CompensationRule {
  id: number
  name: string // مثال: تعويض_عطل_نظام
  description: string
  type: 'free_wash' | 'discount' | 'priority'
  value?: number // للخصم %
  extraWashes?: number // غسلات إضافية
  priorityBoost?: number // تعزيز أولوية
  appliesWhen: {
    systemError?: boolean
    bulkReschedule?: boolean
    consecutiveMissedBySystem?: number // مثل 2 أو 3
  }
  expiresInDays?: number // صلاحية التعويض
}

// بيانات سجل طوارئ (Audit)
export interface EmergencyLog {
  id: number
  timestamp: string // ISO
  actor: string
  event:
    | 'create_case'
    | 'update_case'
    | 'close_case'
    | 'bulk_reschedule'
    | 'grant_compensation'
    | 'notify_waitlist'
    | 'reorganize_schedule'
  details?: string
  payload?: Record<string, unknown>
}

// ثوابت وأمثلة مفيدة
export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  urgent: 5,
  vip: 4,
  longWaiting: 3,
  oldCustomer: 2,
  lowBalance: 1,
}

export const DEFAULT_COMPENSATION_RULES: CompensationRule[] = [
  {
    id: 1,
    name: 'تعويض_عطل_نظام',
    description: 'منح غسلة مجانية عند إلغاء الموعد بسبب عطل تقني',
    type: 'free_wash',
    extraWashes: 1,
    appliesWhen: { systemError: true },
    expiresInDays: 30,
  },
  {
    id: 2,
    name: 'تعويض_إعادة_جدولة_جماعية',
    description: 'خصم 10% عند إعادة الجدولة الجماعية في نفس اليوم',
    type: 'discount',
    value: 10,
    appliesWhen: { bulkReschedule: true },
    expiresInDays: 30,
  },
  {
    id: 3,
    name: 'تعويض_تكرار_الخطأ',
    description: 'منح أولوية + غسلة مجانية بعد 3 مرات متتالية سببها النظام',
    type: 'priority',
    priorityBoost: 3,
    extraWashes: 1,
    appliesWhen: { consecutiveMissedBySystem: 3 },
    expiresInDays: 60,
  },
]

// أنواع لطلبات المعالجة في صفحة الطوارئ
export interface BulkAbsenceHandleRequest {
  appointmentIds: number[] // معرفات المواعيد الغائبة
  strategy:
    | 'smart_reschedule_all'
    | 'manual_for_each'
    | 'deduct_only'
    | 'move_to_waitlist'
  notes?: string
}

export interface BulkAbsenceHandleResponse {
  caseId?: number
  result: BulkRescheduleResult
  waitListed?: number[] // عملاء أضيفوا لقائمة الانتظار
  compensationsGranted?: Array<{ customerId: number; ruleId: number }>
  logs: EmergencyLog[]
