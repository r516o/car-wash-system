// src/lib/data/dataGenerator.ts

import type { Customer } from '@/types/customer.types'
import type { Appointment } from '@/types/appointment.types'
import { generateBulkSchedule } from '../algorithms/autoScheduler'
import { DEFAULT_SUBSCRIPTION } from '../utils/constants'
import { toISODate } from '../utils/dateUtils'

// أسماء عربية للعملاء
const ARABIC_FIRST_NAMES = [
  'محمد', 'أحمد', 'عبدالله', 'فهد', 'سعد', 'خالد', 'عبدالعزيز', 'سلطان', 'عبدالرحمن', 'تركي',
  'فيصل', 'ناصر', 'عمر', 'علي', 'يوسف', 'إبراهيم', 'حسن', 'مشعل', 'بدر', 'راشد',
  'سامي', 'طلال', 'ماجد', 'نواف', 'عادل', 'وليد', 'فارس', 'زيد', 'صالح', 'عثمان',
]

const ARABIC_LAST_NAMES = [
  'العتيبي', 'القحطاني', 'الدوسري', 'الشمري', 'الحربي', 'المطيري', 'العنزي', 'السبيعي',
  'الزهراني', 'الغامدي', 'البقمي', 'الشهراني', 'الأحمدي', 'الجهني', 'العمري', 'الفهد',
  'الرشيد', 'السديري', 'العسيري', 'البلوي', 'الثبيتي', 'اللحياني', 'الخالدي', 'السلمي',
]

// أنواع السيارات الشائعة
const CAR_TYPES = [
  'تويوتا كامري', 'هيونداي سوناتا', 'نيسان التيما', 'مازدا 6', 'هوندا أكورد',
  'شيفروليه كابتيفا', 'تويوتا راف 4', 'نيسان باترول', 'جي إم سي يوكن', 'لاندكروزر',
  'كيا سيراتو', 'هيونداي إلنترا', 'مرسيدس E-Class', 'BMW سيريز 5', 'أودي A6',
  'لكزس ES', 'جيب رانجلر', 'فورد اكسبلورر', 'شيفروليه تاهو', 'نيسان باثفايندر',
]

// توليد رقم جوال عشوائي
const generatePhone = (): string => {
  const prefix = '05'
  const digits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  return prefix + digits
}

// توليد عميل واحد
const generateCustomer = (id: number): Customer => {
  const firstName = ARABIC_FIRST_NAMES[Math.floor(Math.random() * ARABIC_FIRST_NAMES.length)]
  const lastName = ARABIC_LAST_NAMES[Math.floor(Math.random() * ARABIC_LAST_NAMES.length)]
  const name = `${firstName} ${lastName}`
  
  const carType = CAR_TYPES[Math.floor(Math.random() * CAR_TYPES.length)]
  const carSize = Math.random() > 0.6 ? 'كبيرة' : 'صغيرة'
  
  // اختيار 3 أيام عشوائية مفضلة
  const allDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
  const shuffled = [...allDays].sort(() => Math.random() - 0.5)
  const preferredDays = shuffled.slice(0, 3) as any
  
  const preferredPeriods = ['صباحي', 'مسائي', 'مرن']
  const preferredPeriod = preferredPeriods[Math.floor(Math.random() * preferredPeriods.length)] as any
  
  const today = new Date()
  const subscriptionStart = toISODate(new Date(2025, 9, 1)) // 1 أكتوبر 2025
  const subscriptionEnd = toISODate(new Date(2025, 9, 31)) // 31 أكتوبر 2025
  
  return {
    id,
    name,
    phone: generatePhone(),
    carType,
    carSize,
    subscriptionStart,
    subscriptionEnd,
    totalWashes: DEFAULT_SUBSCRIPTION.TOTAL_WASHES,
    paidWashes: DEFAULT_SUBSCRIPTION.PAID_WASHES,
    freeWashes: DEFAULT_SUBSCRIPTION.FREE_WASHES,
    remainingWashes: DEFAULT_SUBSCRIPTION.TOTAL_WASHES,
    completedWashes: 0,
    missedWashes: 0,
    preferredDays,
    preferredPeriod,
    status: 'نشط',
    monthlyPrice: DEFAULT_SUBSCRIPTION.MONTHLY_PRICE,
    totalSpent: DEFAULT_SUBSCRIPTION.MONTHLY_PRICE,
    joinDate: toISODate(new Date(2025, 8, Math.floor(Math.random() * 30) + 1)),
    isVIP: Math.random() > 0.9, // 10% VIP
  }
}

// توليد 100 عميل
export const generate100Customers = (): Customer[] => {
  const customers: Customer[] = []
  
  for (let i = 1; i <= 100; i++) {
    customers.push(generateCustomer(i))
  }
  
  return customers
}

// توليد 1000 موعد لـ100 عميل (10 لكل عميل)
export const generate1000Appointments = (customers: Customer[]): Appointment[] => {
  const year = 2025
  const month = 10 // أكتوبر
  
  console.log('🔄 جاري توليد 1000 موعد للـ100 عميل...')
  
  const result = generateBulkSchedule(customers, year, month, [])
  
  console.log(`✅ تم توليد ${result.totalScheduled} موعد`)
  console.log(`❌ فشل ${result.totalFailed} عميل`)
  
  // دمج جميع المواعيد
  const allAppointments: Appointment[] = []
  
  result.results.forEach(({ customer, result: scheduleResult }) => {
    if (scheduleResult.success && scheduleResult.schedule) {
      // ملء بيانات العميل في كل موعد
      scheduleResult.schedule.forEach(apt => {
        apt.customerName = customer.name
        apt.phone = customer.phone
        apt.carType = customer.carType
        apt.carSize = customer.carSize
      })
      
      allAppointments.push(...scheduleResult.schedule)
    }
  })
  
  return allAppointments
}

// توليد البيانات الكاملة
export const generateInitialData = (): {
  customers: Customer[]
  appointments: Appointment[]
} => {
  console.log('🚀 بدء توليد البيانات الأولية...')
  
  const customers = generate100Customers()
  console.log(`✅ تم توليد ${customers.length} عميل`)
  
  const appointments = generate1000Appointments(customers)
  console.log(`✅ تم توليد ${appointments.length} موعد`)
  
  return { customers, appointments }
}

// فحص هل البيانات موجودة مسبقاً
export const shouldGenerateData = (
  existingCustomers: Customer[],
  existingAppointments: Appointment[]
): boolean => {
  // إذا لا يوجد عملاء، نولد البيانات
  if (existingCustomers.length === 0) return true
  
  // إذا يوجد عملاء قليلين جداً، نولد البيانات
  if (existingCustomers.length < 10) return true
  
  return false
}
