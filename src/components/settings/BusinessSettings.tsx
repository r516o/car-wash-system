// src/components/settings/BusinessSettings.tsx

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export const BusinessSettings = () => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">إعدادات النشاط</h2>
      <Input label="اسم النشاط" placeholder="غسيل السيارات المتنقل" />
      <Input label="رقم الجوال" placeholder="05XXXXXXXX" />
      <Input label="البريد الإلكتروني" type="email" />
      <Button className="mt-4">حفظ التغييرات</Button>
    </div>
  )
}
