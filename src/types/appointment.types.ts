// تعريفات المواعيد

export type AppointmentStatus = 'قادم' | 'جاري' | 'مكتمل' | 'غائب' | 'معاد جدولته' | 'ملغي';
export type Period = 'صباحي' | 'مسائي';

export interface Appointment {
  // معلومات أساسية
  id: number;
  customerId: number; // ربط بالعميل
  
  // معلومات العميل (نسخة للعرض السريع)
  customerName: string;
  phone: string;
  carType: string;
  carSize: 'صغيرة' | 'كبيرة';
  
  // معلومات الموعد
  date: string; // التاريخ (YYYY-MM-DD)
  dayName: string; // اسم اليوم بالعربي (الثلاثاء)
  time: string; // الوقت (HH:MM) مثل 09:00
  period: Period; // الفترة (صباحي/مسائي)
  
  // معلومات الغسلة
  washNumber: number; // رقم الغسلة (1-10)
  status: AppointmentStatus; // حالة الموعد
  statusColor?: string; // لون الحالة للعرض
  
  // معلومات مالية
  price: number; // السعر (10 ريال)
  isPaid: boolean; // مدفوع؟
  isFree: boolean; // مجاني؟
  
  // معلومات إضافية
  notes?: string; // ملاحظات
  createdAt: string; // تاريخ الإنشاء (ISO string)
  updatedAt: string; // آخر تحديث (ISO string)
  completedAt?: string; // تاريخ الإتمام (ISO string)
  
  // إعادة الجدولة
  wasRescheduled: boolean; // تم إعادة جدولته؟
  originalDate?: string; // التاريخ الأصلي (YYYY-MM-DD)
  rescheduleReason?: string; // سبب إعادة الجدولة
  rescheduledBy?: string; // من قام بإعادة الجدولة
  
  // موقع العميل (للنظام المتقدم)
  location?: {
    address: string;
    latitude?: number;
    longitude?: number;
    zone?: string; // المنطقة
  };
}

export interface TimeSlot {
  time: string; // الوقت (09:00)
  available: boolean; // متاح؟
  appointmentId?: number; // رقم الموعد (إذا محجوز)
  customerName?: string; // اسم العميل (إذا محجوز)
}

export interface DaySchedule {
  date: string; // التاريخ (YYYY-MM-DD)
  dayName: string; // اسم اليوم
  morning: {
    capacity: number; // السعة (15)
    slots: Appointment[]; // المواعيد
    available: number; // المتاح
  };
  evening: {
    capacity: number; // السعة (18)
    slots: Appointment[]; // المواعيد
    available: number; // المتاح
  };
  totalScheduled: number; // إجمالي المجدول
  totalCompleted: number; // إجمالي المكتمل
  totalMissed: number; // إجمالي الغائب
}

export interface MonthSchedule {
  year: number; // السنة (2025)
  month: number; // الشهر (10)
  days: DaySchedule[]; // جميع أيام الشهر
  totalAppointments: number; // إجمالي المواعيد
  completedAppointments: number; // المكتمل
  missedAppointments: number; // الغائب
  averageDaily: number; // المتوسط اليومي
}

export interface AppointmentFilters {
  date?: string; // الفلترة بالتاريخ
  period?: Period; // الفلترة بالفترة
  status?: AppointmentStatus; // الفلترة بالحالة
  customerId?: number; // الفلترة بالعميل
  search?: string; // البحث (اسم/جوال/سيارة)
}

export interface RescheduleRequest {
  appointmentId: number;
  newDate: string; // التاريخ الجديد
  newTime: string; // الوقت الجديد
  reason?: string; // السبب
  isAutomatic?: boolean; // إعادة جدولة تلقائية؟
}

export interface RescheduleResult {
  success: boolean;
  newAppointment?: Appointment;
  message: string;
  conflicts?: string[]; // قائمة التعارضات (إن وجدت)
}

export interface ConflictCheck {
  hasConflict: boolean;
  conflicts: Array<{
    type: 'exact_time' | 'capacity' | 'customer_duplicate' | 'other';
    message: string;
    appointmentId?: number;
  }>;
}

export interface ScheduleGenerationRequest {
  customerId: number;
  year: number;
  month: number;
  preferredDays: string[]; // الأيام المفضلة
  preferredPeriod: Period | 'مرن';
  totalWashes: number; // عدد الغسلات المطلوبة (10)
  startDate?: string; // تاريخ البداية (اختياري)
}

export interface ScheduleGenerationResult {
  success: boolean;
  schedule: Appointment[]; // المواعيد المولدة
  message: string;
  warnings?: string[]; // تحذيرات (إن وجدت)
}

// دالة مساعدة للحصول على لون الحالة
export const getStatusColor = (status: AppointmentStatus): string => {
  const colors: Record<AppointmentStatus, string> = {
    'قادم': '#3B82F6', // أزرق
    'جاري': '#F59E0B', // برتقالي
    'مكتمل': '#10B981', // أخضر
    'غائب': '#EF4444', // أحمر
    'معاد جدولته': '#8B5CF6', // بنفسجي
    'ملغي': '#6B7280', // رمادي
  };
  return colors[status];
};

// الأوقات المتاحة للفترات
export const MORNING_TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00'
];

export const EVENING_TIME_SLOTS = [
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];
