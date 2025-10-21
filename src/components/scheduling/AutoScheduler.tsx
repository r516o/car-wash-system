// src/components/scheduling/AutoScheduler.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useScheduling } from '@/hooks/useScheduling'
import type { Customer } from '@/types/customer.types'

interface AutoSchedulerProps {
  customers: Customer[]
  year: number
  month: number
}

export const AutoScheduler = ({ customers, year, month }: AutoSchedulerProps) => {
  const { scheduleBulk, loading } = useScheduling()
  const [result, setResult] = useState<any>(null)

  const handleSchedule = async () => {
    const res = await scheduleBulk(customers, year, month)
    setResult(res)
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">الجدولة التلقائية</h2>
      <p className="text-gray-600 mb-6">
        جدولة {customers.length} عميل تلقائياً للشهر {month}/{year}
      </p>
      
      <Button onClick={handleSchedule} disabled={loading}>
        {loading ? 'جاري الجدولة...' : 'بدء الجدولة التلقائية'}
      </Button>

      {result && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <p className="font-semibold">✅ تم جدولة {result.totalScheduled} موعد</p>
          <p className="text-sm text-gray-600">فشل: {result.totalFailed} عميل</p>
        </div>
      )}
    </div>
  )
}
