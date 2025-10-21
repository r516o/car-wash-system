// src/components/customers/CustomerList.tsx

import { useState } from 'react'
import type { Customer } from '@/types/customer.types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'

interface CustomerListProps {
  customers: Customer[]
  onEdit?: (customer: Customer) => void
  onDelete?: (customerId: number) => void
  onViewDetails?: (customer: Customer) => void
}

export const CustomerList = ({
  customers,
  onEdit,
  onDelete,
  onViewDetails,
}: CustomerListProps) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.carType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">قائمة العملاء</h2>
        <input
          type="text"
          placeholder="بحث (اسم، جوال، سيارة)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border rounded-lg w-64"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <p className="text-center text-gray-500 py-8">لا توجد نتائج</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">الجوال</th>
                <th className="px-4 py-3 text-right">السيارة</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">الرصيد</th>
                <th className="px-4 py-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{customer.name}</td>
                  <td className="px-4 py-3 text-gray-600">{customer.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{customer.carType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${
                      customer.remainingWashes < 3 ? 'text-danger-600' : 'text-gray-900'
                    }`}>
                      {customer.remainingWashes} غسلات
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onViewDetails?.(customer)}
                      >
                        عرض
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onEdit?.(customer)}
                      >
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onDelete?.(customer.id)}
                      >
                        حذف
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
