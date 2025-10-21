// src/components/dashboard/EmployeeDashboard.tsx

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/ui/StatsCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import * as dataManager from '@/lib/storage/dataManager'
import { getTodayISO } from '@/lib/utils/dateUtils'

export const EmployeeDashboard = () => {
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    remaining: 0,
    missed: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = getTodayISO()
    const appointments = dataManager.getAppointmentsByDate(today)
    
    const completed = appointments.filter(a => a.status === 'مكتمل')
    const remaining = appointments.filter(a => a.status === 'قادم')
    const missed = appointments.filter(a => a.status === 'غائب')
    
    setTodayAppointments(appointments.slice(0, 10)) // أول 10 مواعيد
    setStats({
      total: appointments.length,
      completed: completed.length,
      remaining: remaining.length,
      missed: missed.length,
    })
    
    setLoading(false)
  }, [])

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">لوحة تحكم الموظف</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="مواعيد اليوم"
          value={stats.total}
          icon="📅"
        />
        
        <StatsCard
          title="مكتمل"
          value={stats.completed}
          icon="✅"
        />
        
        <StatsCard
          title="متبقي"
          value={stats.remaining}
          icon="⏳"
        />
        
        <StatsCard
          title="غائب"
          value={stats.missed}
          icon="❌"
        />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">مواعيد اليوم</h2>
        
        {todayAppointments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لا توجد مواعيد اليوم</p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold">{apt.customerName}</p>
                  <p className="text-sm text-gray-600">{apt.carType}</p>
                </div>
                <div className="text-left">
                  <p className="font-semibold">{apt.time}</p>
                  <p className="text-sm text-gray-600">{apt.period}</p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    apt.status === 'مكتمل' ? 'bg-success-100 text-success-700' :
                    apt.status === 'غائب' ? 'bg-danger-100 text-danger-700' :
                    'bg-primary-100 text-primary-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
