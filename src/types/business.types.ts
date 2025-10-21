// تعريفات إعدادات العمل والنظام

export interface BusinessSettings {
  // إعدادات الطاقة الاستيعابية
  morningCapacity: number; // السعة الصباحية (15)
  eveningCapacity: number; // السعة المسائية (18)
  dailyCapacity: number; // السعة اليومية (33)
  
  // إعدادات الوقت
  washDuration: number; // مدة الغسلة بالدقائق (30)
  daysBetweenWashes: number; // الفارق بين الغسلات (3)
  
  // إعدادات الفترات
  morningStartTime: string; // بداية الفترة الصباحية (07:00)
  morningEndTime: string; // نهاية الفترة الصباحية (12:00)
  eveningStartTime: string; // بداية الفترة المسائية (13:00)
  eveningEndTime: string; // نهاية الفترة المسائية (19:00)
  
  // إعدادات الاشتراك
  subscriptionPrice: number; // السعر الشهري (80)
  totalWashesPerMonth: number; // إجمالي الغسلات (10)
  paidWashes: number; // الغسلات المدفوعة (8)
  freeWashes: number; // الغسلات المجانية (2)
  pricePerWash: number; // سعر الغسلة الواحدة (10)
  
  // إعدادات الأعمال
  businessName: string; // اسم الشركة
  businessPhone: string; // رقم الجوال
  businessEmail: string; // البريد الإلكتروني
  businessAddress: string; // العنوان
  
  // إعدادات متقدمة
  enableWaitingList: boolean; // تفعيل قائمة الانتظار
  enableAutoRescheduling: boolean; // تفعيل إعادة الجدولة التلقائية
  enableCompensation: boolean; // تفعيل نظام التعويض
  maxMissedAppointments: number; // الحد الأقصى للغياب قبل الإيقاف (5)
}

export interface SystemStats {
  totalCustomers: number; // إجمالي العملاء
  activeCustomers: number; // العملاء النشطين
  totalAppointments: number; // إجمالي المواعيد
  completedAppointments: number; // المواعيد المكتملة
  missedAppointments: number; // المواعيد الغائبة
  rescheduledAppointments: number; // المواعيد المعاد جدولتها
  todayAppointments: number; // مواعيد اليوم
  monthlyRevenue: number; // الإيراد الشهري
  averageAttendanceRate: number; // معدل الحضور المتوسط
}

export interface DailyStats {
  date: string; // التاريخ
  totalScheduled: number; // المجدول اليوم
  completed: number; // المكتمل
  missed: number; // الغائب
  remaining: number; // المتبقي
  morningScheduled: number; // الصباحي المجدول
  morningCompleted: number; // الصباحي المكتمل
  eveningScheduled: number; // المسائي المجدول
  eveningCompleted: number; // المسائي المكتمل
  revenue: number; // الإيراد اليومي
  attendanceRate: number; // معدل الحضور
}

export interface MonthlyStats {
  month: number; // الشهر (1-12)
  year: number; // السنة
  totalAppointments: number; // إجمالي المواعيد
  completedAppointments: number; // المكتملة
  missedAppointments: number; // الغائبة
  totalRevenue: number; // إجمالي الإيراد
  averageAttendanceRate: number; // معدل الحضور المتوسط
  averageDailyAppointments: number; // متوسط المواعيد اليومية
  daysInMonth: number; // عدد أيام الشهر
  workingDays: number; // أيام العمل
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  morningCapacity: 15,
  eveningCapacity: 18,
  dailyCapacity: 33,
  washDuration: 30,
  daysBetweenWashes: 3,
  morningStartTime: '07:00',
  morningEndTime: '12:00',
  eveningStartTime: '13:00',
  eveningEndTime: '19:00',
  subscriptionPrice: 80,
  totalWashesPerMonth: 10,
  paidWashes: 8,
  freeWashes: 2,
  pricePerWash: 10,
  businessName: 'غسيل السيارات المتنقل',
  businessPhone: '0500000000',
  businessEmail: 'info@carwash.sa',
  businessAddress: 'الرياض، المملكة العربية السعودية',
  enableWaitingList: true,
  enableAutoRescheduling: true,
  enableCompensation: true,
  maxMissedAppointments: 5,
};
