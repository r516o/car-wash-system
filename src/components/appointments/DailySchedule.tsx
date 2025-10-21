// src/components/appointments/DailySchedule.tsx

import type { Appointment } from '@/types/appointment.types'
import { AppointmentCard } from '@/components/ui/AppointmentCard'
import { Button } from '@/components/ui/Button'
import { MORNING_TIME_SLOTS, EVENING_TIME_SLOTS } from '@/lib/utils/constants'

interface DailyScheduleProps {
  date: string
  appointments: Appointment[]
  onStatusChange?: (appointmentId: number, status: string) => void
  onReschedule?: (appointmentId: number) => void
}

export const DailySchedule = ({ 
  date, 
  appointments, 
  onStatusChange,
  onReschedule 
}: DailyScheduleProps) => {
  const morningAppointments = appointments.filter(a => a.period === 'صباحي')
  const eveningAppointments = appointments.filter(a => a.period === 'مسائي')

  const renderTimeSlots = (period: 'صباحي' | 'مسائي', periodAppointments: Appointment[]) => {
    const timeSlots = period === 'صباحي' ? MORNING_TIME_SLOTS : EVENING_TIME_SLOTS
    
    return (
      <div className="space-y-2">
        {timeSlots.map((time) => {
          const appointment = periodAppointments.find(a => a.time === time)
          
          return (
            <div key={time} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-16 text-sm font-semibold text-gray-600">
                {time}
              </div>
              
              {appointment ? (
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{appointment.customerName}</p>
                    <p className="text-sm text-gray-600">{appointment.carType}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      appointment.status === 'مكتمل' ? 'bg-green-100 text-green-700' :
                      appointment.status === 'غائب' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {appointment.status}
                    </span>
                    
                    {appointment.status === 'قادم' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => onStatusChange?.(appointment.id, 'مكتمل')}
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => onStatusChange?.(appointment.id, 'غائب')}
                        >
                          ✗
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onReschedule?.(appointment.id)}
                        >
                          ↻
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-gray-400 text-sm">
                  متاح
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">
        جدول اليوم - {date}
      </h2>
      
      {/* الفترة الصباحية */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🌅 الفترة الصباحية (7:00 - 12:00)
          <span className="text-sm font-normal text-gray-600">
            ({morningAppointments.length}/15)
          </span>
        </h3>
        {renderTimeSlots('صباحي', morningAppointments)}
      </div>

      {/* الفترة المسائية */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🌆 الفترة المسائية (13:00 - 19:00)
          <span className="text-sm font-normal text-gray-600">
            ({eveningAppointments.length}/18)
          </span>
        </h3>
        {renderTimeSlots('مسائي', eveningAppointments)}
      </div>

      {/* ملخص اليوم */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{appointments.length}</p>
            <p className="text-sm text-gray-600">إجمالي</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {appointments.filter(a => a.status === 'مكتمل').length}
            </p>
            <p className="text-sm text-gray-600">مكتمل</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {appointments.filter(a => a.status === 'غائب').length}
            </p>
            <p className="text-sm text-gray-600">غائب</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {appointments.filter(a => a.status === 'قادم').length}
            </p>
            <p className="text-sm text-gray-600">متبقي</p>
          </div>
        </div>
      </div>
    </div>
  )
}
