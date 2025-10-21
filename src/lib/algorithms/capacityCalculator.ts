// src/lib/algorithms/capacityCalculator.ts

import type { Appointment } from '@/types/appointment.types'
import { DEFAULT_CAPACITY } from '../utils/constants'

// حساب الطاقة الإجمالية المتاحة لشهر
export const calculateMonthlyCapacity = (
  year: number,
  month: number
): number => {
  const daysInMonth = new Date(year, month, 0).getDate()
  return daysInMonth * DEFAULT_CAPACITY.DAILY
}

// حساب الاستخدام الفعلي
export const calculateUtilization = (
  appointments: Appointment[],
  year: number,
  month: number
): {
  totalCapacity: number
  usedSlots: number
  availableSlots: number
  utilizationRate: number
} => {
  const totalCapacity = calculateMonthlyCapacity(year, month)
  const monthAppointments = appointments.filter(a => {
    const [y, m] = a.date.split('-').map(Number)
    return y === year && m === month && a.status !== 'ملغي'
  })
  
  const usedSlots = monthAppointments.length
  const availableSlots = totalCapacity - usedSlots
  const utilizationRate = (usedSlots / totalCapacity) * 100
  
  return {
    totalCapacity,
    usedSlots,
    availableSlots,
    utilizationRate,
  }
}

// حساب أفضل توزيع للمواعيد
export const calculateOptimalDistribution = (
  totalAppointments: number
): {
  morningPerDay: number
  eveningPerDay: number
  totalDaysNeeded: number
} => {
  const daysNeeded = Math.ceil(totalAppointments / DEFAULT_CAPACITY.DAILY)
  const avgPerDay = totalAppointments / daysNeeded
  
  // توزيع نسبي 15:18
  const ratio = DEFAULT_CAPACITY.MORNING / DEFAULT_CAPACITY.DAILY
  const morningPerDay = Math.round(avgPerDay * ratio)
  const eveningPerDay = Math.round(avgPerDay * (1 - ratio))
  
  return {
    morningPerDay,
    eveningPerDay,
    totalDaysNeeded: daysNeeded,
  }
}
