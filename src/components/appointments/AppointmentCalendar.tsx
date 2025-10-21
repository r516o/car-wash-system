// src/components/appointments/AppointmentCalendar.tsx

import { useState } from 'react'
import type { Appointment } from '@/types/appointment.types'
import { generateMonthDates, getArabicDayNameFromISO } from '@/lib/utils/dateUtils'
import { getDayCapacity } from '@/lib/algorithms/conflictDetection'

interface AppointmentCalendarProps {
  year: number
  month: number
  appointments: Appointment[]
  onDateClick?: (date: string) => void
}

export const AppointmentCalendar = ({ 
  year, 
  month, 
  appointments,
  onDateClick 
}: AppointmentCalendarProps) => {
  const dates = generateMonthDates(year, month)
  
  const getDayColor = (date: string) => {
    const capacity = getDayCapacity(date, appointments)
    const utilization = (capacity.totalUsed / 33) * 100
    
    if (utilization === 0) return 'bg-gray-100'
    if (utilization < 50) return 'bg-green-100'
    if (utilization < 80) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">
        تقويم المواعيد - {month}/{year}
      </h2>
      
      <div className="grid grid-cols-7 gap-2">
        {/* رؤوس الأيام */}
        {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day) => (
          <div key={day} className="text-center font-bold text-gray-700 py-2">
            {day}
          </div>
        ))}
        
        {/* الأيام */}
        {dates.map((date) => {
          const dayName = getArabicDayNameFromISO(date)
          const capacity = getDayCapacity(date, appointments)
          const dayNum = parseInt(date.split('-')[2])
          
          return (
            <button
              key={date}
              onClick={() => onDateClick?.(date)}
              className={`${getDayColor(date)} rounded-lg p-3 hover:ring-2 hover:ring-primary-500 transition-all`}
            >
              <div className="text-right font-bold">{dayNum}</div>
              <div className="text-xs text-gray-600 mt-1">
                {capacity.totalUsed}/33
              </div>
            </button>
          )
        })}
      </div>

      {/* مفتاح الألوان */}
      <div className="flex gap-4 mt-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <span>فارغ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span>أقل من 50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 rounded"></div>
          <span>50-80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span>أكثر من 80%</span>
        </div>
      </div>
    </div>
  )
}
