// src/lib/storage/localStorage.ts

import { STORAGE_KEYS } from '../utils/constants'
import type { Customer } from '@/types/customer.types'
import type { Appointment } from '@/types/appointment.types'
import type { BusinessSettings } from '@/types/business.types'

// قراءة JSON من localStorage بأمان
const getItem = <T>(key: string, fallback: T): T => {
  try {
    const item = window.localStorage.getItem(key)
    if (!item) return fallback
    return JSON.parse(item) as T
  } catch (error) {
    console.error(`خطأ في قراءة ${key}:`, error)
    return fallback
  }
}

// كتابة JSON إلى localStorage بأمان
const setItem = <T>(key: string, value: T): boolean => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`خطأ في حفظ ${key}:`, error)
    return false
  }
}

// حذف عنصر من localStorage
const removeItem = (key: string): boolean => {
  try {
    window.localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`خطأ في حذف ${key}:`, error)
    return false
  }
}

// مسح جميع بيانات النظام
export const clearAllData = (): boolean => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      window.localStorage.removeItem(key)
    })
    return true
  } catch (error) {
    console.error('خطأ في مسح البيانات:', error)
    return false
  }
}

// ————— العملاء —————

export const getCustomers = (): Customer[] => {
  return getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, [])
}

export const setCustomers = (customers: Customer[]): boolean => {
  return setItem(STORAGE_KEYS.CUSTOMERS, customers)
}

export const getCustomerById = (id: number): Customer | undefined => {
  const customers = getCustomers()
  return customers.find(c => c.id === id)
}

export const addCustomer = (customer: Customer): boolean => {
  const customers = getCustomers()
  customers.push(customer)
  return setCustomers(customers)
}

export const updateCustomer = (id: number, updates: Partial<Customer>): boolean => {
  const customers = getCustomers()
  const index = customers.findIndex(c => c.id === id)
  if (index === -1) return false
  
  customers[index] = { ...customers[index], ...updates }
  return setCustomers(customers)
}

export const deleteCustomer = (id: number): boolean => {
  const customers = getCustomers()
  const filtered = customers.filter(c => c.id !== id)
  return setCustomers(filtered)
}

// ————— المواعيد —————

export const getAppointments = (): Appointment[] => {
  return getItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, [])
}

export const setAppointments = (appointments: Appointment[]): boolean => {
  return setItem(STORAGE_KEYS.APPOINTMENTS, appointments)
}

export const getAppointmentById = (id: number): Appointment | undefined => {
  const appointments = getAppointments()
  return appointments.find(a => a.id === id)
}

export const addAppointment = (appointment: Appointment): boolean => {
  const appointments = getAppointments()
  appointments.push(appointment)
  return setAppointments(appointments)
}

export const addAppointments = (newAppointments: Appointment[]): boolean => {
  const appointments = getAppointments()
  appointments.push(...newAppointments)
  return setAppointments(appointments)
}

export const updateAppointment = (id: number, updates: Partial<Appointment>): boolean => {
  const appointments = getAppointments()
  const index = appointments.findIndex(a => a.id === id)
  if (index === -1) return false
  
  appointments[index] = { ...appointments[index], ...updates }
  return setAppointments(appointments)
}

export const deleteAppointment = (id: number): boolean => {
  const appointments = getAppointments()
  const filtered = appointments.filter(a => a.id !== id)
  return setAppointments(filtered)
}

export const deleteAppointmentsByCustomerId = (customerId: number): boolean => {
  const appointments = getAppointments()
  const filtered = appointments.filter(a => a.customerId !== customerId)
  return setAppointments(filtered)
}

// ————— الإعدادات —————

export const getSettings = (): BusinessSettings | null => {
  return getItem<BusinessSettings | null>(STORAGE_KEYS.SETTINGS, null)
}

export const setSettings = (settings: BusinessSettings): boolean => {
  return setItem(STORAGE_KEYS.SETTINGS, settings)
}

export const updateSettings = (updates: Partial<BusinessSettings>): boolean => {
  const currentSettings = getSettings()
  if (!currentSettings) return false
  
  const newSettings = { ...currentSettings, ...updates }
  return setSettings(newSettings)
}

// ————— السجلات (Logs) —————

export interface SystemLog {
  id: number
  timestamp: string
  type: 'info' | 'warning' | 'error' | 'action'
  message: string
  details?: Record<string, unknown>
}

export const getLogs = (): SystemLog[] => {
  return getItem<SystemLog[]>(STORAGE_KEYS.LOGS, [])
}

export const addLog = (log: Omit<SystemLog, 'id' | 'timestamp'>): boolean => {
  const logs = getLogs()
  const newLog: SystemLog = {
    ...log,
    id: Date.now(),
    timestamp: new Date().toISOString(),
  }
  
  logs.push(newLog)
  
  // الاحتفاظ بآخر 1000 سجل فقط
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000)
  }
  
  return setItem(STORAGE_KEYS.LOGS, logs)
}

export const clearLogs = (): boolean => {
  return setItem(STORAGE_KEYS.LOGS, [])
}

// ————— قائمة الانتظار —————

export interface WaitingListEntry {
  id: number
  customerId: number
  requestedAt: string
  notes?: string
}

export const getWaitingList = (): WaitingListEntry[] => {
  return getItem<WaitingListEntry[]>(STORAGE_KEYS.WAITING_LIST, [])
}

export const setWaitingList = (list: WaitingListEntry[]): boolean => {
  return setItem(STORAGE_KEYS.WAITING_LIST, list)
}

export const addToWaitingList = (entry: Omit<WaitingListEntry, 'id' | 'requestedAt'>): boolean => {
  const list = getWaitingList()
  const newEntry: WaitingListEntry = {
    ...entry,
    id: Date.now(),
    requestedAt: new Date().toISOString(),
  }
  
  list.push(newEntry)
  return setWaitingList(list)
}

export const removeFromWaitingList = (id: number): boolean => {
  const list = getWaitingList()
  const filtered = list.filter(e => e.id !== id)
  return setWaitingList(filtered)
}

// ————— دوال مساعدة —————

// التحقق من توفر localStorage
export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__test__'
    window.localStorage.setItem(testKey, 'test')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

// حجم البيانات المخزنة تقريباً (بالكيلوبايت)
export const getStorageSize = (): number => {
  let total = 0
  
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = window.localStorage.getItem(key)
      if (item) {
        total += item.length
      }
    })
  } catch {
    return 0
  }
  
  return Math.round(total / 1024) // KB
}

// نسخ احتياطي كامل
export const exportBackup = (): string => {
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      customers: getCustomers(),
      appointments: getAppointments(),
      settings: getSettings(),
      logs: getLogs(),
      waitingList: getWaitingList(),
    },
  }
  
  return JSON.stringify(backup, null, 2)
}

// استعادة من نسخة احتياطية
export const importBackup = (backupJson: string): boolean => {
  try {
    const backup = JSON.parse(backupJson)
    
    if (!backup.data) {
      throw new Error('صيغة النسخة الاحتياطية غير صحيحة')
    }
    
    // استعادة البيانات
    if (backup.data.customers) setCustomers(backup.data.customers)
    if (backup.data.appointments) setAppointments(backup.data.appointments)
    if (backup.data.settings) setSettings(backup.data.settings)
    if (backup.data.logs) setItem(STORAGE_KEYS.LOGS, backup.data.logs)
    if (backup.data.waitingList) setWaitingList(backup.data.waitingList)
    
    return true
  } catch (error) {
    console.error('خطأ في استعادة النسخة الاحتياطية:', error)
    return false
  }
}
