// src/components/customers/CustomerForm.tsx

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Customer, CustomerFormData } from '@/types/customer.types'
import { generateId } from '@/lib/utils/utils'
import { toISODate } from '@/lib/utils/dateUtils'

interface CustomerFormProps {
  customer?: Customer
  onSubmit: (customer: Customer) => void
  onCancel: () => void
}

export const CustomerForm = ({ customer, onSubmit, onCancel }: CustomerFormProps) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    carType: customer?.carType || '',
    carSize: customer?.carSize || 'صغيرة',
    plateNumber: customer?.plateNumber || '',
    carColor: customer?.carColor || '',
    preferredDays: customer?.preferredDays || [],
    preferredPeriod: customer?.preferredPeriod || 'مرن',
    address: customer?.address || '',
    notes: customer?.notes || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: keyof CustomerFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const toggleDay = (day: string) => {
    const days = formData.preferredDays.includes(day as any)
      ? formData.preferredDays.filter((d) => d !== day)
      : [...formData.preferredDays, day as any]
    
    if (days.length <= 3) {
      handleChange('preferredDays', days)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) newErrors.name = 'الاسم مطلوب'
    if (!formData.phone.trim()) newErrors.phone = 'رقم الجوال مطلوب'
    if (!/^05\d{8}$/.test(formData.phone)) newErrors.phone = 'رقم الجوال غير صحيح (05XXXXXXXX)'
    if (!formData.carType.trim()) newErrors.carType = 'نوع السيارة مطلوب'
    if (formData.preferredDays.length !== 3) newErrors.preferredDays = 'يجب اختيار 3 أيام'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    const now = new Date()
    const newCustomer: Customer = {
      id: customer?.id || generateId(),
      ...formData,
      subscriptionStart: customer?.subscriptionStart || toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
      subscriptionEnd: customer?.subscriptionEnd || toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      totalWashes: customer?.totalWashes || 10,
      paidWashes: customer?.paidWashes || 8,
      freeWashes: customer?.freeWashes || 2,
      remainingWashes: customer?.remainingWashes || 10,
      completedWashes: customer?.completedWashes || 0,
      missedWashes: customer?.missedWashes || 0,
      status: customer?.status || 'نشط',
      monthlyPrice: customer?.monthlyPrice || 80,
      totalSpent: customer?.totalSpent || 80,
      joinDate: customer?.joinDate || toISODate(now),
      isVIP: customer?.isVIP || false,
    }

    onSubmit(newCustomer)
  }

  const allDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="الاسم الكامل *"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        error={errors.name}
      />

      <Input
        label="رقم الجوال *"
        value={formData.phone}
        onChange={(e) => handleChange('phone', e.target.value)}
        placeholder="05XXXXXXXX"
        error={errors.phone}
      />

      <Input
        label="البريد الإلكتروني"
        type="email"
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
      />

      <Input
        label="نوع السيارة *"
        value={formData.carType}
        onChange={(e) => handleChange('carType', e.target.value)}
        placeholder="مثال: تويوتا كامري"
        error={errors.carType}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">حجم السيارة *</label>
        <div className="flex gap-4">
          {['صغيرة', 'كبيرة'].map((size) => (
            <label key={size} className="flex items-center">
              <input
                type="radio"
                checked={formData.carSize === size}
                onChange={() => handleChange('carSize', size)}
                className="ml-2"
              />
              {size}
            </label>
          ))}
        </div>
      </div>

      <Input
        label="رقم اللوحة"
        value={formData.plateNumber}
        onChange={(e) => handleChange('plateNumber', e.target.value)}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          الأيام المفضلة * (اختر 3 أيام)
        </label>
        <div className="grid grid-cols-4 gap-2">
          {allDays.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                formData.preferredDays.includes(day as any)
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        {errors.preferredDays && (
          <p className="text-danger-600 text-sm mt-1">{errors.preferredDays}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">الفترة المفضلة *</label>
        <select
          value={formData.preferredPeriod}
          onChange={(e) => handleChange('preferredPeriod', e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="صباحي">صباحي (7ص - 12م)</option>
          <option value="مسائي">مسائي (1م - 7م)</option>
          <option value="مرن">مرن (أي وقت)</option>
        </select>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" variant="primary">
          {customer ? 'تحديث' : 'إضافة'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}
