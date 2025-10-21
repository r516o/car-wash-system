// src/lib/algorithms/rescheduling.ts

import type { Appointment, RescheduleRequest, RescheduleResult } from '@/types/appointment.types'
import type { Customer } from '@/types/customer.types'
import { getAvailableTimeSlots, checkAppointmentConflict } from './conflictDetection'
import { getArabicDayNameFromISO, addDaysISO } from '../utils/dateUtils'
import { MORNING_TIME_SLOTS, EVENING_TIME_SLOTS } from '../utils/constants'

// اقتراح أقرب موعد متاح للعميل بعد غياب/إلغاء
export const suggestNextSlot = (
  customer: Customer,
  afterDate: string,
  appointments: Appointment[]
): { date: string; time: string; period: 'صباحي' | 'مسائي' } | undefined => {
  // جرب خلال 30 يوم قادم على الأيام المفضلة فقط
  const preferredDays = customer.preferredDays
  for (let i = 3; i <= 30; i += 1) {
    const candidateDate = addDaysISO(afterDate, i)
    const dayName = getArabicDayNameFromISO(candidateDate)
    if (!preferredDays.includes(dayName)) continue

    // جرب الفترات المفضلة
    const periods: ('صباحي' | 'مسائي')[] =
      customer.preferredPeriod === 'صباحي'
        ? ['صباحي']
        : customer.preferredPeriod === 'مسائي'
        ? ['مسائي']
        : ['صباحي', 'مسائي']

    for (const period of periods) {
      const timeSlots =
        period === 'صباحي' ? MORNING_TIME_SLOTS : EVENING_TIME_SLOTS

      const available = getAvailableTimeSlots(
        candidateDate,
        period,
        appointments,
        timeSlots
      )
      if (available.length > 0) {
        // أول وقت متاح
        return { date: candidateDate, time: available[0], period }
      }
    }
  }
  return undefined
}

// إعادة الجدولة التلقائية لموعد بناءً على طلب
export const autoReschedule = (
  request: RescheduleRequest,
  customer: Customer,
  allAppointments: Appointment[]
): RescheduleResult => {
  // اقتراح أقرب موعد مفضل
  const suggestion = suggestNextSlot(
    customer,
    request.newDate || allAppointments.find(a => a.id === request.appointmentId)?.date || '',
    allAppointments
  )

  if (!suggestion) {
    return {
      success: false,
      message: 'لا توجد مواعيد متاحة خلال 30 يوم للأيام والفترات المفضلة.',
    }
  }

  // تنفيذ إعادة الجدولة فعلياً
  const newAppointment: Partial<Appointment> = {
    customerId: customer.id,
    date: suggestion.date,
    time: suggestion.time,
    period: suggestion.period,
  }

  // تحقق التعارضات
  const conflicts = checkAppointmentConflict(newAppointment, allAppointments)
  if (conflicts.hasConflict) {
    return {
      success: false,
      message: 'تعذر إعادة الجدولة بسبب تعارضات في الوقت أو الطاقة.',
      conflicts: conflicts.conflicts.map(c => c.message),
    }
  }

  // كائن الموعد الجديد
  const oldApt = allAppointments.find(a => a.id === request.appointmentId)
  const newApt: Appointment = {
    ...(oldApt || {}),
    id: Date.now(), // أو أي generateId آخر
    date: suggestion.date,
    time: suggestion.time,
    period: suggestion.period,
    status: 'قادم',
    wasRescheduled: true,
    originalDate: oldApt?.date,
    rescheduleReason: request.reason || 'غياب العميل',
    rescheduledBy: request.isAutomatic ? 'system' : 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    success: true,
    newAppointment: newApt,
    message: `تم اقتراح موعد جديد للعميل في ${suggestion.date} - ${suggestion.time}`,
  }
}

// إعادة جدولة جماعية لقائمة مواعيد غائبة
export const bulkAutoReschedule = (
  appointments: Appointment[],
  customersMap: Record<number, Customer>,
  allAppointments: Appointment[]
): Array<{ appointmentId: number; result: RescheduleResult }> => {
  return appointments.map(apt => {
    const customer = customersMap[apt.customerId]
    if (!customer) {
      return { appointmentId: apt.id, result: { success: false, message: 'العميل غير موجود' } }
    }

    const result = autoReschedule(
      {
        appointmentId: apt.id,
        newDate: apt.date,
        reason: 'غياب جماعي',
        isAutomatic: true
      },
      customer,
      allAppointments
    )

    return { appointmentId: apt.id, result }
  })
}
