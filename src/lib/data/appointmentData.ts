// src/hooks/useStorage.ts

import { useState, useEffect } from 'react'
import * as storage from '@/lib/storage/localStorage'
import type { Customer } from '@/types/customer.types'
import type { Appointment } from '@/types/appointment.types'

export const useStorage = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setCustomers(storage.getCustomers())
    setAppointments(storage.getAppointments())
    setLoading(false)
  }

  const refreshData = () => {
    loadData()
  }

  useEffect(() => {
    loadData()
  }, [])

  return {
    customers,
    appointments,
    loading,
    refreshData,
    setCustomers,
    setAppointments,
  }
}
