// src/components/ui/StatsCard.tsx

interface StatsCardProps {
  title: string
  value: string | number
  icon?: string
  color?: string
}

export const StatsCard = ({ title, value, icon, color = 'primary' }: StatsCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-primary-500">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        {icon && (
          <div className="text-4xl opacity-20">{icon}</div>
        )}
      </div>
    </div>
  )
}
