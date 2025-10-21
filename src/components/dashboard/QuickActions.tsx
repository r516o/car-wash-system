// src/components/dashboard/QuickActions.tsx

import { Button } from '@/components/ui/Button'

interface QuickActionsProps {
  onAddCustomer?: () => void
  onShowReports?: () => void
  onEmergency?: () => void
}

export const QuickActions = ({
  onAddCustomer,
  onShowReports,
  onEmergency,
}: QuickActionsProps) => (
  <div className="flex gap-4 flex-wrap">
    <Button variant="primary" onClick={onAddCustomer}>
      إضافة عميل جديد
    </Button>
    <Button variant="success" onClick={onShowReports}>
      عرض التقارير
    </Button>
    <Button variant="warning" onClick={onEmergency}>
      إدارة الطوارئ
    </Button>
  </div>
)
