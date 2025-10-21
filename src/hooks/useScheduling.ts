// src/hooks/useScheduling.ts

import { useState, useCallback } from 'react'
import * as storage from '@/lib/storage/localStorage'
import { generateCustomerSchedule, generateBulkSchedule } from '@/lib/algorithms/autoScheduler'
import type { Customer } from '@/types/customer.types'
import type { Appointment } from '@/types/appointment.types'

export const useScheduling = () => {
  const [loading, setLoading] = useState(false)

  const scheduleCustomer = useCallback(async (
    customer: Customer,
    year: number,
    month: number
  ) => {
    setLoading(true)
    try {
      const existingAppointments = storage.getAppointments()
      const result = generateCustomerSchedule(customer, year, month, existingAppointments)
      
      if (result.success && result.schedule) {
        storage.addAppointments(result.schedule)
      }
      
      setLoading(false)
      return result
    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [])

  const scheduleBulk = useCallback(async (
    customers: Customer[],
    year: number,
    month: number
  ) => {
    setLoading(true)
    try {
      const existingAppointments = storage.getAppointments()
      const result = generateBulkSchedule(customers, year, month, existingAppointments)
      
      // حفظ جميع المواعيد الناجحة
      const allAppointments = result.results
        .filter(r => r.result.success)
        .flatMap(r => r.result.schedule || [])
      
      storage.addAppointments(allAppointments)
      
      setLoading(false)
      return result
    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [])

  return {
    loading,
    scheduleCustomer,
    scheduleBulk,
  }
}
