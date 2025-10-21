// src/components/dashboard/AdminDashboard.tsx

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/ui/StatsCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import * as dataManager from '@/lib/storage/dataManager'

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    todayAppointments: 0,
    completedToday: 0,
    monthlyRevenue: 0,
    attendanceRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // تحميل الإحصائيات
    const customerStats = dataManager.getCustomerStats()
    const todayStats = dataManager.getTodayStats()
    const appointmentStats = dataManager.getAppointmentStats()
    
    const attendanceRate = todayStats.total > 0 
      ? (todayStats.completed / todayStats.total) * 100 
      : 0

    setStats({
      totalCustomers: customerStats.total,
      activeCustomers: customerStats.active,
      todayAppointments: todayStats.total,
      completedToday: todayStats.completed,
      monthlyRevenue: customerStats.totalRevenue,
      attendanceRate: Math.round(attendanceRate),
    })
    
    setLoading(false)
  }, [])

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">لوحة تحكم المدير</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          title="إجمالي العملاء"
          value={stats.totalCustomers}
          icon="👥"
        />
        
        <StatsCard
          title="العملاء النشطين"
          value={stats.activeCustomers}
          icon="✅"
        />
        
        <StatsCard
          title="مواعيد اليوم"
          value={stats.todayAppointments}
          icon="📅"
        />
        
        <StatsCard
          title="المكتمل اليوم"
          value={stats.completedToday}
          icon="✔️"
        />
        
        <StatsCard
          title="الإيراد الشهري"
          value={`${stats.monthlyRevenue} ريال`}
          icon="💰"
        />
        
        <StatsCard
          title="معدل الحضور"
          value={`${stats.attendanceRate}%`}
          icon="📊"
        />
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">الإجراءات السريعة</h2>
        <div className="flex gap-4 flex-wrap">
          <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            إضافة عميل جديد
          </button>
          <button className="px-6 py-3 bg-success-600 text-white rounded-lg hover:bg-success-700">
            عرض التقارير
          </button>
          <button className="px-6 py-3 bg-warning-600 text-white rounded-lg hover:bg-warning-700">
            إدارة الطوارئ
          </button>
        </div>
      </div>
    </div>
  )
}
