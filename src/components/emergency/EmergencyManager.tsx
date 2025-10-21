// src/components/emergency/EmergencyManager.tsx

import { Button } from '@/components/ui/Button'

export const EmergencyManager = () => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">🚨 إدارة الطوارئ</h2>
      <p className="text-gray-600 mb-6">
        إدارة حالات الغياب الجماعي والظروف الطارئة
      </p>
      <div className="space-y-4">
        <Button variant="warning">كشف الغياب الجماعي</Button>
        <Button variant="danger">إعادة جدولة طارئة</Button>
      </div>
    </div>
  )
}
