// src/components/customers/CustomerDetails.tsx

import type { Customer } from '@/types/customer.types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils/formatUtils'

interface CustomerDetailsProps {
  customer: Customer
  onEdit?: () => void
  onSchedule?: () => void
  onClose?: () => void
}

export const CustomerDetails = ({ 
  customer, 
  onEdit, 
  onSchedule, 
  onClose 
}: CustomerDetailsProps) => {
  return (
    <div className="space-y-6">
      {/* معلومات أساسية */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">المعلومات الأساسية</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">الاسم</label>
            <p className="font-semibold">{customer.name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">الجوال</label>
            <p className="font-semibold">{customer.phone}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">البريد الإلكتروني</label>
            <p className="font-semibold">{customer.email || 'غير محدد'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">الحالة</label>
            <StatusBadge status={customer.status} />
          </div>
        </div>
      </div>

      {/* معلومات السيارة */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">معلومات السيارة</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">نوع السيارة</label>
            <p className="font-semibold">{customer.carType}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">حجم السيارة</label>
            <p className="font-semibold">{customer.carSize}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">رقم اللوحة</label>
            <p className="font-semibold">{customer.plateNumber || 'غير محدد'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">اللون</label>
            <p className="font-semibold">{customer.carColor || 'غير محدد'}</p>
          </div>
        </div>
      </div>

      {/* معلومات الاشتراك */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">تفاصيل الاشتراك</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">تاريخ البداية</label>
            <p className="font-semibold">{formatDate(customer.subscriptionStart)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">تاريخ الانتهاء</label>
            <p className="font-semibold">{formatDate(customer.subscriptionEnd)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">الغسلات المتبقية</label>
            <p className={`font-semibold text-2xl ${
              customer.remainingWashes < 3 ? 'text-red-600' : 'text-green-600'
            }`}>
              {customer.remainingWashes} / {customer.totalWashes}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-600">السعر الشهري</label>
            <p className="font-semibold">{formatCurrency(customer.monthlyPrice)}</p>
          </div>
        </div>
      </div>

      {/* التفضيلات */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">التفضيلات</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">الأيام المفضلة</label>
            <div className="flex gap-2 mt-1">
              {customer.preferredDays.map((day) => (
                <span 
                  key={day} 
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">الفترة المفضلة</label>
            <p className="font-semibold">{customer.preferredPeriod}</p>
          </div>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3">الإحصائيات</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{customer.completedWashes}</p>
            <p className="text-sm text-gray-600">مكتمل</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{customer.missedWashes}</p>
            <p className="text-sm text-gray-600">غائب</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(customer.totalSpent)}</p>
            <p className="text-sm text-gray-600">إجمالي المدفوع</p>
          </div>
        </div>
      </div>

      {/* ملاحظات */}
      {customer.notes && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">الملاحظات</h3>
          <p className="text-gray-700">{customer.notes}</p>
        </div>
      )}

      {/* الإجراءات */}
      <div className="flex gap-4 pt-4 border-t">
        <Button variant="primary" onClick={onEdit}>
          تعديل البيانات
        </Button>
        <Button variant="success" onClick={onSchedule}>
          جدولة المواعيد
        </Button>
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </div>
  )
}
