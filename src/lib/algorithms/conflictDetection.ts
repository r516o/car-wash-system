// src/lib/algorithms/conflictDetection.ts

import type { Appointment } from '@/types/appointment.types'
import type { ConflictCheck } from '@/types/appointment.types'
import { DEFAULT_CAPACITY } from '../utils/constants'

// فحص تعارض موعد واحد مع المواعيد الموجودة
export const checkAppointmentConflict = (
  newAppointment: Partial<Appointment>,
  existingAppointments: Appointment[],
  excludeId?: number // لاستثناء موعد معين عند التعديل
): ConflictCheck => {
  const conflicts: ConflictCheck['conflicts'] = []
  
  // فلترة المواعيد (استثناء الملغي والمعاد جدولته)
  const activeAppointments = existingAppointments.filter(a => 
    a.id !== excludeId && 
    a.status !== 'ملغي' && 
    a.status !== 'معاد جدولته'
  )
  
  // 1. فحص التعارض: نفس التاريخ والوقت بالضبط
  const exactTimeConflict = activeAppointments.find(a => 
    a.date === newAppointment.date && 
    a.time === newAppointment.time
  )
  
  if (exactTimeConflict) {
    conflicts.push({
      type: 'exact_time',
      message: `يوجد موعد آخر في نفس الوقت: ${exactTimeConflict.customerName}`,
      appointmentId: exactTimeConflict.id,
    })
  }
  
  // 2. فحص السعة: هل اكتملت سعة الفترة؟
  if (newAppointment.date && newAppointment.period) {
    const sameDate = activeAppointments.filter(a => a.date === newAppointment.date)
    const samePeriod = sameDate.filter(a => a.period === newAppointment.period)
    
    const capacity = newAppointment.period === 'صباحي' 
      ? DEFAULT_CAPACITY.MORNING 
      : DEFAULT_CAPACITY.EVENING
    
    if (samePeriod.length >= capacity) {
      conflicts.push({
        type: 'capacity',
        message: `اكتملت السعة للفترة ${newAppointment.period} (${samePeriod.length}/${capacity})`,
      })
    }
  }
  
  // 3. فحص التكرار: هل للعميل موعد آخر في نفس اليوم؟
  if (newAppointment.customerId && newAppointment.date) {
    const customerDuplicate = activeAppointments.find(a => 
      a.customerId === newAppointment.customerId && 
      a.date === newAppointment.date
    )
    
    if (customerDuplicate) {
      conflicts.push({
        type: 'customer_duplicate',
        message: 'لدى العميل موعد آخر في نفس اليوم',
        appointmentId: customerDuplicate.id,
      })
    }
  }
  
  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  }
}

// فحص تعارضات متعددة (للجدولة الجماعية)
export const checkBulkConflicts = (
  newAppointments: Partial<Appointment>[],
  existingAppointments: Appointment[]
): Array<{
  appointment: Partial<Appointment>
  conflicts: ConflictCheck
}> => {
  return newAppointments.map(apt => ({
    appointment: apt,
    conflicts: checkAppointmentConflict(apt, existingAppointments),
  }))
}

// فحص توفر الوقت في يوم وفترة
export const isTimeSlotAvailable = (
  date: string,
  time: string,
  period: 'صباحي' | 'مسائي',
  existingAppointments: Appointment[]
): boolean => {
  const activeAppointments = existingAppointments.filter(a => 
    a.status !== 'ملغي' && 
    a.status !== 'معاد جدولته'
  )
  
  // فحص الوقت المحدد
  const exactMatch = activeAppointments.find(a => 
    a.date === date && 
    a.time === time
  )
  
  if (exactMatch) return false
  
  // فحص السعة
  const samePeriod = activeAppointments.filter(a => 
    a.date === date && 
    a.period === period
  )
  
  const capacity = period === 'صباحي' 
    ? DEFAULT_CAPACITY.MORNING 
    : DEFAULT_CAPACITY.EVENING
  
  return samePeriod.length < capacity
}

// الحصول على جميع الأوقات المتاحة في يوم معين
export const getAvailableTimeSlots = (
  date: string,
  period: 'صباحي' | 'مسائي',
  existingAppointments: Appointment[],
  timeSlots: readonly string[]
): string[] => {
  const activeAppointments = existingAppointments.filter(a => 
    a.date === date && 
    a.period === period &&
    a.status !== 'ملغي' && 
    a.status !== 'معاد جدولته'
  )
  
  const bookedTimes = new Set(activeAppointments.map(a => a.time))
  
  return timeSlots.filter(time => !bookedTimes.has(time))
}

// فحص السعة المتبقية ليوم معين
export const getDayCapacity = (
  date: string,
  existingAppointments: Appointment[]
): {
  morningUsed: number
  morningAvailable: number
  eveningUsed: number
  eveningAvailable: number
  totalUsed: number
  totalAvailable: number
} => {
  const activeAppointments = existingAppointments.filter(a => 
    a.date === date &&
    a.status !== 'ملغي' && 
    a.status !== 'معاد جدولته'
  )
  
  const morning = activeAppointments.filter(a => a.period === 'صباحي')
  const evening = activeAppointments.filter(a => a.period === 'مسائي')
  
  return {
    morningUsed: morning.length,
    morningAvailable: DEFAULT_CAPACITY.MORNING - morning.length,
    eveningUsed: evening.length,
    eveningAvailable: DEFAULT_CAPACITY.EVENING - evening.length,
    totalUsed: activeAppointments.length,
    totalAvailable: DEFAULT_CAPACITY.DAILY - activeAppointments.length,
  }
}

// فحص إمكانية جدولة عميل في شهر معين
export const canScheduleCustomerInMonth = (
  customerId: number,
  year: number,
  month: number,
  requiredWashes: number,
  existingAppointments: Appointment[]
): {
  possible: boolean
  reason?: string
  availableDays: number
} => {
  // حساب عدد الأيام في الشهر
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // حساب السعة المتبقية لكل يوم
  const daysWithCapacity = []
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const capacity = getDayCapacity(date, existingAppointments)
    
    if (capacity.totalAvailable > 0) {
      daysWithCapacity.push(date)
    }
  }
  
  if (daysWithCapacity.length < requiredWashes) {
    return {
      possible: false,
      reason: `الأيام المتاحة (${daysWithCapacity.length}) أقل من الغسلات المطلوبة (${requiredWashes})`,
      availableDays: daysWithCapacity.length,
    }
  }
  
  return {
    possible: true,
    availableDays: daysWithCapacity.length,
  }
}

// فحص التعارضات بين موعدين (للمقارنة)
export const compareAppointments = (
  apt1: Partial<Appointment>,
  apt2: Partial<Appointment>
): {
  sameTime: boolean
  sameCustomer: boolean
  sameDate: boolean
} => {
  return {
    sameTime: apt1.date === apt2.date && apt1.time === apt2.time,
    sameCustomer: apt1.customerId === apt2.customerId,
    sameDate: apt1.date === apt2.date,
  }
}

// فحص شامل للنظام بأكمله
export const validateScheduleIntegrity = (
  appointments: Appointment[]
): {
  valid: boolean
  issues: Array<{
    severity: 'error' | 'warning'
    message: string
    appointmentIds?: number[]
  }>
} => {
  const issues: Array<{
    severity: 'error' | 'warning'
    message: string
    appointmentIds?: number[]
  }> = []
  
  const activeAppointments = appointments.filter(a => 
    a.status !== 'ملغي' && 
    a.status !== 'معاد جدولته'
  )
  
  // فحص التعارضات في الوقت
  const timeMap = new Map<string, number[]>()
  activeAppointments.forEach(apt => {
    const key = `${apt.date}_${apt.time}`
    const ids = timeMap.get(key) || []
    ids.push(apt.id)
    timeMap.set(key, ids)
  })
  
  timeMap.forEach((ids, key) => {
    if (ids.length > 1) {
      issues.push({
        severity: 'error',
        message: `تعارض في الوقت: ${key}`,
        appointmentIds: ids,
      })
    }
  })
  
  // فحص تجاوز السعة
  const dateMap = new Map<string, { morning: number; evening: number }>()
  activeAppointments.forEach(apt => {
    const current = dateMap.get(apt.date) || { morning: 0, evening: 0 }
    if (apt.period === 'صباحي') current.morning++
    else current.evening++
    dateMap.set(apt.date, current)
  })
  
  dateMap.forEach((counts, date) => {
    if (counts.morning > DEFAULT_CAPACITY.MORNING) {
      issues.push({
        severity: 'error',
        message: `تجاوز السعة الصباحية في ${date}: ${counts.morning}/${DEFAULT_CAPACITY.MORNING}`,
      })
    }
    if (counts.evening > DEFAULT_CAPACITY.EVENING) {
      issues.push({
        severity: 'error',
        message: `تجاوز السعة المسائية في ${date}: ${counts.evening}/${DEFAULT_CAPACITY.EVENING}`,
      })
    }
  })
  
  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  }
}
