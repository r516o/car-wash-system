// تعريفات العملاء

export type CustomerStatus = 'نشط' | 'منتهي' | 'معلق';
export type CarSize = 'صغيرة' | 'كبيرة';
export type PreferredPeriod = 'صباحي' | 'مسائي' | 'مرن';
export type DayOfWeek = 'السبت' | 'الأحد' | 'الاثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس' | 'الجمعة';

export interface Customer {
  // معلومات أساسية
  id: number;
  name: string; // الاسم الكامل
  phone: string; // رقم الجوال (05xxxxxxxx)
  email?: string; // البريد الإلكتروني (اختياري)
  
  // معلومات السيارة
  carType: string; // نوع السيارة (تويوتا كامري)
  carSize: CarSize; // حجم السيارة
  plateNumber?: string; // رقم اللوحة (اختياري)
  carColor?: string; // لون السيارة (اختياري)
  
  // معلومات الاشتراك
  subscriptionStart: string; // تاريخ بدء الاشتراك (YYYY-MM-DD)
  subscriptionEnd: string; // تاريخ انتهاء الاشتراك (YYYY-MM-DD)
  totalWashes: number; // إجمالي الغسلات (10)
  paidWashes: number; // الغسلات المدفوعة (8)
  freeWashes: number; // الغسلات المجانية (2)
  remainingWashes: number; // الغسلات المتبقية (1-10)
  completedWashes: number; // الغسلات المكتملة
  missedWashes: number; // الغسلات الغائبة
  
  // تفضيلات الجدولة
  preferredDays: DayOfWeek[]; // الأيام المفضلة (3 أيام)
  preferredPeriod: PreferredPeriod; // الفترة المفضلة
  
  // الحالة والمعلومات المالية
  status: CustomerStatus; // حالة الاشتراك
  monthlyPrice: number; // السعر الشهري (80)
  totalSpent: number; // إجمالي الإنفاق
  
  // معلومات إضافية
  joinDate: string; // تاريخ الانضمام (YYYY-MM-DD)
  lastWashDate?: string; // تاريخ آخر غسلة (YYYY-MM-DD)
  nextWashDate?: string; // تاريخ الغسلة القادمة (YYYY-MM-DD)
  notes?: string; // ملاحظات
  address?: string; // العنوان (اختياري)
  
  // التعويضات والمكافآت
  compensations?: Compensation[]; // قائمة التعويضات
  isVIP?: boolean; // عميل VIP؟
}

export interface Compensation {
  id: number;
  type: 'free_wash' | 'discount' | 'extra_service'; // نوع التعويض
  reason: string; // سبب التعويض
  grantedAt: string; // تاريخ المنح (ISO string)
  expiresAt: string; // تاريخ الانتهاء (ISO string)
  used: boolean; // هل تم الاستخدام؟
  usedAt?: string; // تاريخ الاستخدام (ISO string)
  value?: number; // القيمة (للخصم)
}

export interface CustomerFormData {
  name: string;
  phone: string;
  email?: string;
  carType: string;
  carSize: CarSize;
  plateNumber?: string;
  carColor?: string;
  preferredDays: DayOfWeek[];
  preferredPeriod: PreferredPeriod;
  address?: string;
  notes?: string;
}

export interface CustomerFilters {
  search?: string; // البحث بالاسم/الجوال/السيارة
  status?: CustomerStatus; // الفلترة بالحالة
  carSize?: CarSize; // الفلترة بحجم السيارة
  preferredPeriod?: PreferredPeriod; // الفلترة بالفترة
  hasLowBalance?: boolean; // رصيد منخفض (أقل من 3 غسلات)
  needsRenewal?: boolean; // يحتاج تجديد (ينتهي خلال 7 أيام)
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  expiredCustomers: number;
  suspendedCustomers: number;
  customersWithLowBalance: number; // أقل من 3 غسلات
  customersNeedingRenewal: number; // ينتهي خلال 7 أيام
  totalRevenue: number;
  averageWashesCompleted: number;
  averageAttendanceRate: number;
}

// بيانات افتراضية للاختبار
export const SAMPLE_CUSTOMER: Customer = {
  id: 1,
  name: 'محمد أحمد العتيبي',
  phone: '0501234567',
  email: 'customer@example.com',
  carType: 'تويوتا كامري',
  carSize: 'صغيرة',
  plateNumber: 'أ ب ج 1234',
  carColor: 'أبيض',
  subscriptionStart: '2025-10-01',
  subscriptionEnd: '2025-10-31',
  totalWashes: 10,
  paidWashes: 8,
  freeWashes: 2,
  remainingWashes: 7,
  completedWashes: 3,
  missedWashes: 0,
  preferredDays: ['السبت', 'الاثنين', 'الأربعاء'],
  preferredPeriod: 'صباحي',
  status: 'نشط',
  monthlyPrice: 80,
  totalSpent: 80,
  joinDate: '2025-10-01',
  notes: '',
  compensations: [],
  isVIP: false,
};
