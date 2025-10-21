// src/hooks/useCustomers.ts

import { useState, useCallback } from 'react'
import * as storage from '@/lib/storage/localStorage'
import * as dataManager from '@/lib/storage/dataManager'
import type { Customer, CustomerFilters } from '@/types/customer.types'

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers())
  const [filters, setFilters] = useState<CustomerFilters>({})

  const refresh = useCallback(() => {
    setCustomers(storage.getCustomers())
  }, [])

  const addCustomer = useCallback((customer: Customer) => {
    storage.addCustomer(customer)
    refresh()
  }, [refresh])

  const updateCustomer = useCallback((id: number, updates: Partial<Customer>) => {
    storage.updateCustomer(id, updates)
    refresh()
  }, [refresh])

  const deleteCustomer = useCallback((id: number) => {
    dataManager.deleteCustomerWithAppointments(id)
    refresh()
  }, [refresh])

  const filteredCustomers = dataManager.findCustomers(filters)

  return {
    customers,
    filteredCustomers,
    filters,
    setFilters,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refresh,
  }
}
