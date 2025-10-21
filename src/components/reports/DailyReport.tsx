// src/components/reports/DailyReport.tsx

import { useReports } from '@/hooks/useReports'
import { StatsCard } from '@/components/ui/StatsCard'

export const DailyReport = ({ date }: { date: string }) => {
  const { generateDailyReport } = useReports()
  const stats = generateDailyReport(date)

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">تقرير يوم {date}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="إجمالي" value={stats.total} />
        <StatsCard title="مكتمل" value={stats.completed} />
        <StatsCard title="غائب" value={stats.missed} />
        <StatsCard title="متبقي" value={stats.remaining} />
      </div>
    </div>
  )
}
