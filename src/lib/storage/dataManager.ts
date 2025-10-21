// src/lib/storage/dataManager.ts

import * as storage from './localStorage'
import type { Customer, CustomerFilters } from '@/types/customer.types'
import type { Appointment, AppointmentFilters } from '@/types/appointment.types'
import { getTodayISO, compareISO } from '../utils/dateUtils'

// ————— استعلامات العملاء —————

export const findCustomers = (filters: CustomerFilters = {}): Customer[] => {
  let customers = storage.getCustomers()
  
  // الفلترة بالبحث (اسم/جوال/سيارة)
  if (filters.search) {
    const query = filters.search.toLowerCase().trim()
    customers = customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.carType.toLowerCase().includes(query)
    )
  }
  
  // الفلترة بالحالة
  if (filters.status) {
    customers = customers.filter(c => c.status === filters.status)
  }
  
  // الفلترة بحجم السيارة
  if (filters.carSize) {
    customers = customers.filter(c => c.carSize === filters.carSize)
  }
  
  // الفلترة بالفترة المفضلة
  if (filters.preferredPeriod) {
    customers = customers.filter(c => c.preferredPeriod === filters.preferredPeriod)
  }
  
  // رصيد منخفض (أقل من 3)
  if (filters.hasLowBalance) {
    customers = customers.filter(c => c.remainingWashes < 3)
  }
  
  // يحتاج تجديد (ينتهي خلال 7 أيام)
  if (filters.needsRenewal) {
    const today = getTodayISO()
    customers = customers.filter(c => {
      const daysLeft = Math.floor(
        (new Date(c.subscriptionEnd).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysLeft <= 7 && daysLeft >= 0
    })
  }
  
  return customers
}

export const getActiveCustomers = (): Customer[] => {
  return findCustomers({ status: 'نشط' })
}

export const getCustomersWithLowBalance = (): Customer[] => {
  return findCustomers({ hasLowBalance: true })
}

export const getCustomersNeedingRenewal = (): Customer[] => {
  return findCustomers({ needsRenewal: true })
}

// ————— استعلامات المواعيد —————

export const findAppointments = (filters: AppointmentFilters = {}): Appointment[] => {
  let appointments = storage.getAppointments()
  
  // الفلترة بالتاريخ
  if (filters.date) {
    appointments = appointments.filter(a => a.date === filters.date)
  }
  
  // الفلترة بالفترة
  if (filters.period) {
    appointments = appointments.filter(a => a.period === filters.period)
  }
  
  // الفلترة بالحالة
  if (filters.status) {
    appointments = appointments.filter(a => a.status === filters.status)
  }
  
  // الفلترة بالعميل
  if (filters.customerId) {
    appointments = appointments.filter(a => a.customerId === filters.customerId)
  }
  
  // البحث (اسم/جوال/سيارة)
  if (filters.search) {
    const query = filters.search.toLowerCase().trim()
    appointments = appointments.filter(a =>
      a.customerName.toLowerCase().includes(query) ||
      a.phone.includes(query) ||
      a.carType.toLowerCase().includes(query)
    )
  }
  
  return appointments
}

export const getTodayAppointments = (): Appointment[] => {
  return findAppointments({ date: getTodayISO() })
}

export const getAppointmentsByDate = (date: string): Appointment[] => {
  return findAppointments({ date })
}

export const getAppointmentsByCustomer = (customerId: number): Appointment[] => {
  return findAppointments({ customerId })
}

export const getUpcomingAppointments = (): Appointment[] => {
  const today = getTodayISO()
  return storage.getAppointments()
    .filter(a => compareISO(a.date, today) >= 0 && a.status === 'قادم')
    .sort((a, b) => {
      const dateComp = compareISO(a.date, b.date)
      if (dateComp !== 0) return dateComp
      return a.time.localeCompare(b.time)
    })
}

export const getCompletedAppointments = (): Appointment[] => {
  return findAppointments({ status: 'مكتمل' })
}

export const getMissedAppointments = (): Appointment[] => {
  return findAppointments({ status: 'غائب' })
}

// ————— إحصائيات —————

export const getCustomerStats = () => {
  const customers = storage.getCustomers()
  
  return {
    total: customers.length,
    active: customers.filter(c => c.status === 'نشط').length,
    expired: customers.filter(c => c.status === 'منتهي').length,
    suspended: customers.filter(c => c.status === 'معلق').length,
    lowBalance: customers.filter(c => c.remainingWashes < 3).length,
    needingRenewal: getCustomersNeedingRenewal().length,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
  }
}

export const getAppointmentStats = () => {
  const appointments = storage.getAppointments()
  
  return {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'مكتمل').length,
    missed: appointments.filter(a => a.status === 'غائب').length,
    upcoming: appointments.filter(a => a.status === 'قادم').length,
    rescheduled: appointments.filter(a => a.wasRescheduled).length,
  }
}

export const getTodayStats = () => {
  const todayAppointments = getTodayAppointments()
  
  return {
    total: todayAppointments.length,
    completed: todayAppointments.filter(a => a.status === 'مكتمل').length,
    missed: todayAppointments.filter(a => a.status === 'غائب').length,
    remaining: todayAppointments.filter(a => a.status === 'قادم').length,
    morningTotal: todayAppointments.filter(a => a.period === 'صباحي').length,
    morningCompleted: todayAppointments.filter(a => a.period === 'صباحي' && a.status === 'مكتمل').length,
    eveningTotal: todayAppointments.filter(a => a.period === 'مسائي').length,
    eveningCompleted: todayAppointments.filter(a => a.period === 'مسائي' && a.status === 'مكتمل').length,
  }
}

// ————— عمليات متقدمة —————

// تحديث رصيد العميل بعد إتمام موعد
export const completeAppointmentAndUpdateCustomer = (appointmentId: number): boolean => {
  const appointment = storage.getAppointmentById(appointmentId)
  if (!appointment) return false
  
  const customer = storage.getCustomerById(appointment.customerId)
  if (!customer) return false
  
  // تحديث الموعد
  const appointmentUpdated = storage.updateAppointment(appointmentId, {
    status: 'مكتمل',
    completedAt: new Date().toISOString(),
  })
  
  if (!appointmentUpdated) return false
  
  // تحديث العميل
  const customerUpdated = storage.updateCustomer(appointment.customerId, {
    remainingWashes: Math.max(0, customer.remainingWashes - 1),
    completedWashes: customer.completedWashes + 1,
    lastWashDate: appointment.date,
  })
  
  // سجل العملية
  storage.addLog({
    type: 'action',
    message: `تم إتمام موعد للعميل ${customer.name}`,
    details: { appointmentId, customerId: customer.id },
  })
  
  return customerUpdated
}

// تسجيل غياب مع تحديث العميل
export const markAppointmentMissed = (appointmentId: number): boolean => {
  const appointment = storage.getAppointmentById(appointmentId)
  if (!appointment) return false
  
  const customer = storage.getCustomerById(appointment.customerId)
  if (!customer) return false
  
  // تحديث الموعد
  const appointmentUpdated = storage.updateAppointment(appointmentId, {
    status: 'غائب',
  })
  
  if (!appointmentUpdated) return false
  
  // تحديث العميل
  const customerUpdated = storage.updateCustomer(appointment.customerId, {
    missedWashes: customer.missedWashes + 1,
  })
  
  // سجل العملية
  storage.addLog({
    type: 'warning',
    message: `غياب: ${customer.name}`,
    details: { appointmentId, customerId: customer.id },
  })
  
  return customerUpdated
}

// حذف عميل مع جميع مواعيده
export const deleteCustomerWithAppointments = (customerId: number): boolean => {
  const customer = storage.getCustomerById(customerId)
  if (!customer) return false
  
  // حذف المواعيد
  storage.deleteAppointmentsByCustomerId(customerId)
  
  // حذف العميل
  const deleted = storage.deleteCustomer(customerId)
  
  if (deleted) {
    storage.addLog({
      type: 'action',
      message: `تم حذف العميل ${customer.name} وجميع مواعيده`,
      details: { customerId },
    })
  }
  
  return deleted
}

// البحث الشامل
export const globalSearch = (query: string): {
  customers: Customer[]
  appointments: Appointment[]
} => {
  return {
    customers: findCustomers({ search: query }),
    appointments: findAppointments({ search: query }),
  }
}

// إحصاءات متقدمة لشهر معين
export const getMonthlyStats = (year: number, month: number) => {
  const appointments = storage.getAppointments().filter(a => {
    const [y, m] = a.date.split('-').map(Number)
    return y === year && m === month
  })
  
  const completed = appointments.filter(a => a.status === 'مكتمل')
  const missed = appointments.filter(a => a.status === 'غائب')
  
  return {
    total: appointments.length,
    completed: completed.length,
    missed: missed.length,
    revenue: completed.reduce((sum, a) => sum + a.price, 0),
    attendanceRate: appointments.length > 0 
      ? (completed.length / appointments.length) * 100 
      : 0,
  }
}
