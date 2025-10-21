// src/lib/algorithms/autoScheduler.ts

import type { Customer } from '@/types/customer.types'
import type { Appointment, ScheduleGenerationRequest, ScheduleGenerationResult } from '@/types/appointment.types'
import { generateMonthDates, getArabicDayNameFromISO } from '../utils/dateUtils'
import { generateId } from '../utils/utils'
import { checkAppointmentConflict, getDayCapacity } from './conflictDetection'
import { MORNING_TIME_SLOTS, EVENING_TIME_SLOTS, DEFAULT_CAPACITY } from '../utils/constants'

// خوارزمية توزيع 10 غسلات لعميل واحد بفارق 3 أيام
export const generateCustomerSchedule = (
  customer: Customer,
  year: number,
  month: number,
  existingAppointments: Appointment[]
): ScheduleGenerationResult => {
  const request: ScheduleGenerationRequest = {
    customerId: customer.id,
    year,
    month,
    preferredDays: customer.preferredDays,
    preferredPeriod: customer.preferredPeriod as any,
    totalWashes: customer.totalWashes,
  }
  
  return generateScheduleForCustomer(request, existingAppointments)
}

// الخوارزمية الرئيسية لتوليد جدول عميل
export const generateScheduleForCustomer = (
  request: ScheduleGenerationRequest,
  existingAppointments: Appointment[]
): ScheduleGenerationResult => {
  const warnings: string[] = []
  const schedule: Appointment[] = []
  
  try {
    // 1. إنشاء قائمة بجميع تواريخ الشهر
    const allDates = generateMonthDates(request.year, request.month)
    
    // 2. فلترة الأيام المفضلة للعميل
    const preferredDates = allDates.filter(date => {
      const dayName = getArabicDayNameFromISO(date)
      return request.preferredDays.includes(dayName as any)
    })
    
    if (preferredDates.length === 0) {
      return {
        success: false,
        schedule: [],
        message: 'لا توجد أيام مفضلة متاحة في هذا الشهر',
        warnings,
      }
    }
    
    // 3. ترتيب التواريخ حسب الأولوية
    const sortedDates = sortDatesByPreference(preferredDates, existingAppointments)
    
    // 4. توزيع المواعيد بفارق 3 أيام
    let lastScheduledDate: string | null = null
    let washNumber = 1
    let dateIndex = 0
    
    while (washNumber <= request.totalWashes && dateIndex < sortedDates.length) {
      const candidateDate = sortedDates[dateIndex]
      
      // التحقق من فارق 3 أيام
      if (lastScheduledDate) {
        const daysDiff = Math.floor(
          (new Date(candidateDate).getTime() - new Date(lastScheduledDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysDiff < 3) {
          dateIndex++
          continue // تخطي هذا التاريخ
        }
      }
      
      // محاولة جدولة في هذا التاريخ
      const appointment = scheduleAppointmentForDate(
        request.customerId,
        candidateDate,
        washNumber,
        request.preferredPeriod,
        existingAppointments
      )
      
      if (appointment) {
        schedule.push(appointment)
        lastScheduledDate = candidateDate
        washNumber++
      } else {
        warnings.push(`تعذر الجدولة في ${candidateDate}`)
      }
      
      dateIndex++
    }
    
    // 5. إذا لم نتمكن من جدولة 10 غسلات، نحاول إيجاد تواريخ بديلة
    if (schedule.length < request.totalWashes) {
      const remaining = request.totalWashes - schedule.length
      const additionalSchedule = findAlternativeDates(
        request,
        remaining,
        schedule,
        existingAppointments
      )
      
      schedule.push(...additionalSchedule)
    }
    
    // 6. النتيجة النهائية
    if (schedule.length === 0) {
      return {
        success: false,
        schedule: [],
        message: 'فشل في جدولة أي موعد',
        warnings,
      }
    }
    
    if (schedule.length < request.totalWashes) {
      warnings.push(`تم جدولة ${schedule.length} من ${request.totalWashes} غسلة فقط`)
    }
    
    return {
      success: schedule.length > 0,
      schedule: schedule.sort((a, b) => a.date.localeCompare(b.date)),
      message: schedule.length === request.totalWashes 
        ? 'تم توليد الجدول بنجاح' 
        : `تم توليد جدول جزئي: ${schedule.length}/${request.totalWashes}`,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
    
  } catch (error) {
    return {
      success: false,
      schedule: [],
      message: `خطأ في التوليد: ${error}`,
      warnings,
    }
  }
}

// ترتيب التواريخ حسب الأولوية (أقل ازدحاماً أولاً)
const sortDatesByPreference = (
  dates: string[],
  existingAppointments: Appointment[]
): string[] => {
  return dates.sort((a, b) => {
    const capacityA = getDayCapacity(a, existingAppointments)
    const capacityB = getDayCapacity(b, existingAppointments)
    
    // أولوية للأيام الأقل ازدحاماً
    const scoreA = capacityA.totalAvailable
    const scoreB = capacityB.totalAvailable
    
    return scoreB - scoreA // ترتيب تنازلي (أعلى سعة متاحة أولاً)
  })
}

// جدولة موعد في تاريخ محدد
const scheduleAppointmentForDate = (
  customerId: number,
  date: string,
  washNumber: number,
  preferredPeriod: 'صباحي' | 'مسائي' | 'مرن',
  existingAppointments: Appointment[]
): Appointment | null => {
  const dayName = getArabicDayNameFromISO(date)
  
  // تحديد الفترات للمحاولة
  const periodsToTry: Array<'صباحي' | 'مسائي'> = []
  
  if (preferredPeriod === 'صباحي') {
    periodsToTry.push('صباحي', 'مسائي')
  } else if (preferredPeriod === 'مسائي') {
    periodsToTry.push('مسائي', 'صباحي')
  } else {
    // مرن: جرب الأقل ازدحاماً أولاً
    const capacity = getDayCapacity(date, existingAppointments)
    if (capacity.morningAvailable >= capacity.eveningAvailable) {
      periodsToTry.push('صباحي', 'مسائي')
    } else {
      periodsToTry.push('مسائي', 'صباحي')
    }
  }
  
  // محاولة كل فترة
  for (const period of periodsToTry) {
    const timeSlots = period === 'صباحي' ? MORNING_TIME_SLOTS : EVENING_TIME_SLOTS
    
    // جرب كل وقت في الفترة
    for (const time of timeSlots) {
      const newAppointment: Partial<Appointment> = {
        customerId,
        date,
        time,
        period,
      }
      
      // فحص التعارض
      const conflict = checkAppointmentConflict(newAppointment, existingAppointments)
      
      if (!conflict.hasConflict) {
        // إنشاء الموعد
        return createAppointment(customerId, date, dayName, time, period, washNumber)
      }
    }
  }
  
  return null // لم نجد وقت متاح
}

// إنشاء كائن موعد كامل
const createAppointment = (
  customerId: number,
  date: string,
  dayName: string,
  time: string,
  period: 'صباحي' | 'مسائي',
  washNumber: number
): Appointment => {
  return {
    id: generateId(),
    customerId,
    customerName: '', // سيتم تعبئته لاحقاً
    phone: '',
    carType: '',
    carSize: 'صغيرة',
    date,
    dayName,
    time,
    period,
    washNumber,
    status: 'قادم',
    price: 10,
    isPaid: washNumber <= 8, // أول 8 مدفوعة
    isFree: washNumber > 8, // آخر 2 مجانية
    wasRescheduled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// البحث عن تواريخ بديلة إذا فشلت الخوارزمية الأساسية
const findAlternativeDates = (
  request: ScheduleGenerationRequest,
  remainingWashes: number,
  existingSchedule: Appointment[],
  existingAppointments: Appointment[]
): Appointment[] => {
  const additionalSchedule: Appointment[] = []
  const scheduledDates = new Set(existingSchedule.map(a => a.date))
  const allDates = generateMonthDates(request.year, request.month)
  
  // جرب جميع التواريخ في الشهر (حتى غير المفضلة)
  for (const date of allDates) {
    if (scheduledDates.has(date)) continue
    
    // تحقق من فارق 3 أيام مع آخر موعد
    const lastDate = existingSchedule[existingSchedule.length - 1]?.date
    if (lastDate) {
      const daysDiff = Math.floor(
        (new Date(date).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff < 3) continue
    }
    
    const appointment = scheduleAppointmentForDate(
      request.customerId,
      date,
      existingSchedule.length + additionalSchedule.length + 1,
      'مرن', // مرن للتواريخ البديلة
      [...existingAppointments, ...existingSchedule, ...additionalSchedule]
    )
    
    if (appointment) {
      additionalSchedule.push(appointment)
      scheduledDates.add(date)
      
      if (additionalSchedule.length >= remainingWashes) {
        break
      }
    }
  }
  
  return additionalSchedule
}

// جدولة جماعية لعدة عملاء
export const generateBulkSchedule = (
  customers: Customer[],
  year: number,
  month: number,
  existingAppointments: Appointment[] = []
): {
  success: boolean
  results: Array<{
    customer: Customer
    result: ScheduleGenerationResult
  }>
  totalScheduled: number
  totalFailed: number
} => {
  const results: Array<{
    customer: Customer
    result: ScheduleGenerationResult
  }> = []
  
  let currentAppointments = [...existingAppointments]
  let totalScheduled = 0
  let totalFailed = 0
  
  // ترتيب العملاء حسب الأولوية (VIP أولاً، ثم القدامى)
  const sortedCustomers = [...customers].sort((a, b) => {
    if (a.isVIP && !b.isVIP) return -1
    if (!a.isVIP && b.isVIP) return 1
    return new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime()
  })
  
  for (const customer of sortedCustomers) {
    const result = generateCustomerSchedule(customer, year, month, currentAppointments)
    
    results.push({ customer, result })
    
    if (result.success) {
      // إضافة المواعيد الجديدة للقائمة
      currentAppointments.push(...result.schedule)
      totalScheduled += result.schedule.length
    } else {
      totalFailed++
    }
  }
  
  return {
    success: totalFailed === 0,
    results,
    totalScheduled,
    totalFailed,
  }
}

// إعادة توزيع المواعيد لتحسين التوزان
export const optimizeScheduleBalance = (
  appointments: Appointment[]
): {
  optimized: Appointment[]
  improvements: string[]
} => {
  const improvements: string[] = []
  const optimized = [...appointments]
  
  // تجميع حسب التاريخ
  const dateGroups = new Map<string, Appointment[]>()
  optimized.forEach(apt => {
    const group = dateGroups.get(apt.date) || []
    group.push(apt)
    dateGroups.set(apt.date, group)
  })
  
  // إعادة توزيع الأوقات لتحسين التوازن
  dateGroups.forEach((dayAppointments, date) => {
    const morning = dayAppointments.filter(a => a.period === 'صباحي')
    const evening = dayAppointments.filter(a => a.period === 'مسائي')
    
    // إذا كان هناك خلل في التوازن
    const morningCapacity = DEFAULT_CAPACITY.MORNING
    const eveningCapacity = DEFAULT_CAPACITY.EVENING
    
    if (morning.length > morningCapacity && evening.length < eveningCapacity) {
      const excess = morning.length - morningCapacity
      const canMove = Math.min(excess, eveningCapacity - evening.length)
      
      if (canMove > 0) {
        // نقل بعض المواعيد للمساء
        for (let i = 0; i < canMove; i++) {
          const apt = morning[morning.length - 1 - i]
          apt.period = 'مسائي'
          apt.time = EVENING_TIME_SLOTS[evening.length + i] || '13:00'
        }
        improvements.push(`تم نقل ${canMove} موعد من الصباح للمساء في ${date}`)
      }
    }
  })
  
  return { optimized, improvements }
}
