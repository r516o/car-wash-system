// src/components/dashboard/StatsOverview.tsx

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/ui/StatsCard'
import * as dataManager from '@/lib/storage/dataManager'

interface StatsData {
  customers: {
    total: number
    active: number
    expired: number
    lowBalance: number
  }
  appointments: {
    total: number
    completed: number
    missed: number
    upcoming: number
  }
  today: {
    total: number
    completed: number
    remaining: number
  }
  revenue: {
    total: number
    monthly: number
  }
}

export const StatsOverview = () => {
  const [stats, setStats] = useState<StatsData>({
    customers: { total: 0, active: 0, expired: 0, lowBalance: 0 },
    appointments: { total: 0, completed: 0, missed: 0, upcoming: 0 },
    today: { total: 0, completed: 0, remaining: 0 },
    revenue: { total: 0, monthly: 0 },
  })

  useEffect(() => {
    const customerStats = dataManager.getCustomerStats()
    const appointmentStats = dataManager.getAppointmentStats()
    const todayStats = dataManager.getTodayStats()

    setStats({
      customers: {
        total: customerStats.total,
        active: customerStats.active,
        expired: customerStats.expired,
        lowBalance: customerStats.lowBalance,
      },
      appointments: {
        total: appointmentStats.total,
        completed: appointmentStats.completed,
        missed: appointmentStats.missed,
        upcoming: appointmentStats.upcoming,
      },
      today: {
        total: todayStats.total,
        completed: todayStats.completed,
        remaining: todayStats.remaining,
      },
      revenue: {
        total: customerStats.totalRevenue,
        monthly: customerStats.totalRevenue,
      },
    })
  }, [])

  return (
    <div className="space-y-8">
      {/* إحصائيات العملاء */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 إحصائيات العملاء</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="إجمالي العملاء"
            value={stats.customers.total}
            icon="👥"
          />
          <StatsCard
            title="عملاء نشطين"
            value={stats.customers.active}
            icon="✅"
          />
          <StatsCard
            title="منتهي الاشتراك"
            value={stats.customers.expired}
            icon="⏰"
          />
          <StatsCard
            title="رصيد منخفض"
            value={stats.customers.lowBalance}
            icon="⚠️"
          />
        </div>
      </div>

      {/* إحصائيات المواعيد */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📅 إحصائيات المواعيد</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="إجمالي المواعيد"
            value={stats.appointments.total}
            icon="📋"
          />
          <StatsCard
            title="مكتمل"
            value={stats.appointments.completed}
            icon="✔️"
          />
          <StatsCard
            title="غائب"
            value={stats.appointments.missed}
            icon="❌"
          />
          <StatsCard
            title="قادم"
            value={stats.appointments.upcoming}
            icon="⏳"
          />
        </div>
      </div>

      {/* إحصائيات اليوم */}
      <div>
        <h2 className="text-2xl font-bold mb-4">🗓️ إحصائيات اليوم</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="مواعيد اليوم"
            value={stats.today.total}
            icon="📅"
          />
          <StatsCard
            title="مكتمل اليوم"
            value={stats.today.completed}
            icon="✅"
          />
          <StatsCard
            title="متبقي اليوم"
            value={stats.today.remaining}
            icon="⏰"
          />
        </div>
      </div>

      {/* إحصائيات الإيرادات */}
      <div>
        <h2 className="text-2xl font-bold mb-4">💰 إحصائيات الإيرادات</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatsCard
            title="إجمالي الإيرادات"
            value={`${stats.revenue.total} ريال`}
            icon="💵"
          />
          <StatsCard
            title="إيراد الشهر"
            value={`${stats.revenue.monthly} ريال`}
            icon="📈"
          />
        </div>
      </div>
    </div>
  )
}
