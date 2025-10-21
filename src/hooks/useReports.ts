// src/hooks/useReports.ts

import { useState } from 'react'
import * as dataManager from '@/lib/storage/dataManager'

export const useReports = () => {
  const generateDailyReport = (date: string) => {
    return dataManager.getTodayStats()
  }
  
  const generateMonthlyReport = (year: number, month: number) => {
    return dataManager.getMonthlyStats(year, month)
  }
  
  return {
    generateDailyReport,
    generateMonthlyReport,
  }
}
