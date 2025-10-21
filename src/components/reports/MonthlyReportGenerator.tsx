// src/components/reports/MonthlyReport.tsx

import { useReports } from '@/hooks/useReports'
import { StatsCard } from '@/components/ui/StatsCard'

export const MonthlyReport = ({ year, month }: { year: number; month: number }) => {
  const { generateMonthlyReport } = useReports()
  const stats = generateMonthlyReport(year, month)

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">تقرير شهر {month}/{year}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatsCard title="إجمالي المواعيد" value={stats.total} />
        <StatsCard title="مكتمل" value={stats.completed} />
        <StatsCard title="الإيراد" value={`${stats.revenue} ريال`} />
      </div>
    </div>
  )
}
