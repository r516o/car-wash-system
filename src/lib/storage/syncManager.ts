// src/lib/storage/syncManager.ts

import * as storage from './localStorage'
import * as dataManager from './dataManager'
import { DEFAULT_BUSINESS_SETTINGS } from '@/types/business.types'

// حالة المزامنة
export interface SyncStatus {
  lastSync: string | null // ISO timestamp
  isHealthy: boolean
  errors: string[]
  warnings: string[]
  dataSize: number // KB
}

// التحقق من سلامة البيانات
export const validateData = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  try {
    // التحقق من العملاء
    const customers = storage.getCustomers()
    if (!Array.isArray(customers)) {
      errors.push('بيانات العملاء غير صالحة')
    } else {
      // التحقق من تفرد المعرفات
      const ids = customers.map(c => c.id)
      const uniqueIds = new Set(ids)
      if (ids.length !== uniqueIds.size) {
        errors.push('يوجد تكرار في معرفات العملاء')
      }
      
      // التحقق من الحقول المطلوبة
      customers.forEach((c, i) => {
        if (!c.name || !c.phone || !c.carType) {
          errors.push(`العميل ${i + 1}: حقول مطلوبة مفقودة`)
        }
      })
    }
    
    // التحقق من المواعيد
    const appointments = storage.getAppointments()
    if (!Array.isArray(appointments)) {
      errors.push('بيانات المواعيد غير صالحة')
    } else {
      // التحقق من تفرد المعرفات
      const ids = appointments.map(a => a.id)
      const uniqueIds = new Set(ids)
      if (ids.length !== uniqueIds.size) {
        errors.push('يوجد تكرار في معرفات المواعيد')
      }
      
      // التحقق من ربط العملاء
      appointments.forEach((a, i) => {
        const customer = storage.getCustomerById(a.customerId)
        if (!customer) {
          errors.push(`الموعد ${i + 1}: مرتبط بعميل غير موجود (${a.customerId})`)
        }
      })
    }
    
    // التحقق من الإعدادات
    const settings = storage.getSettings()
    if (!settings) {
      errors.push('الإعدادات غير موجودة')
    }
    
  } catch (error) {
    errors.push(`خطأ في التحقق من البيانات: ${error}`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

// الحصول على حالة المزامنة
export const getSyncStatus = (): SyncStatus => {
  const validation = validateData()
  const lastSync = localStorage.getItem('__last_sync__')
  
  return {
    lastSync,
    isHealthy: validation.valid,
    errors: validation.errors,
    warnings: [],
    dataSize: storage.getStorageSize(),
  }
}

// تحديث طابع المزامنة
const updateSyncTimestamp = (): void => {
  localStorage.setItem('__last_sync__', new Date().toISOString())
}

// إصلاح البيانات التالفة
export const repairData = (): { repaired: boolean; message: string } => {
  try {
    const validation = validateData()
    
    if (validation.valid) {
      return { repaired: false, message: 'البيانات سليمة ولا تحتاج إصلاح' }
    }
    
    // حذف المواعيد المرتبطة بعملاء غير موجودين
    const appointments = storage.getAppointments()
    const customers = storage.getCustomers()
    const customerIds = new Set(customers.map(c => c.id))
    
    const validAppointments = appointments.filter(a => 
      customerIds.has(a.customerId)
    )
    
    if (validAppointments.length !== appointments.length) {
      storage.setAppointments(validAppointments)
      storage.addLog({
        type: 'warning',
        message: `تم حذف ${appointments.length - validAppointments.length} موعد مرتبط بعملاء غير موجودين`,
      })
    }
    
    // التأكد من وجود الإعدادات
    const settings = storage.getSettings()
    if (!settings) {
      storage.setSettings(DEFAULT_BUSINESS_SETTINGS)
      storage.addLog({
        type: 'info',
        message: 'تم إنشاء إعدادات افتراضية',
      })
    }
    
    updateSyncTimestamp()
    
    return { 
      repaired: true, 
      message: 'تم إصلاح البيانات بنجاح' 
    }
  } catch (error) {
    return { 
      repaired: false, 
      message: `فشل الإصلاح: ${error}` 
    }
  }
}

// نسخ احتياطي تلقائي
export const createAutoBackup = (): { success: boolean; backup?: string; error?: string } => {
  try {
    const backup = storage.exportBackup()
    
    // حفظ في localStorage بمفتاح مؤقت
    const backupKey = `__backup_${Date.now()}__`
    localStorage.setItem(backupKey, backup)
    
    // الاحتفاظ بآخر 5 نسخ فقط
    const allKeys = Object.keys(localStorage)
    const backupKeys = allKeys
      .filter(k => k.startsWith('__backup_'))
      .sort()
    
    if (backupKeys.length > 5) {
      const toDelete = backupKeys.slice(0, backupKeys.length - 5)
      toDelete.forEach(k => localStorage.removeItem(k))
    }
    
    storage.addLog({
      type: 'info',
      message: 'تم إنشاء نسخة احتياطية تلقائية',
    })
    
    updateSyncTimestamp()
    
    return { success: true, backup }
  } catch (error) {
    return { 
      success: false, 
      error: `فشل النسخ الاحتياطي: ${error}` 
    }
  }
}

// استعادة آخر نسخة احتياطية
export const restoreLastBackup = (): { success: boolean; message: string } => {
  try {
    const allKeys = Object.keys(localStorage)
    const backupKeys = allKeys
      .filter(k => k.startsWith('__backup_'))
      .sort()
      .reverse()
    
    if (backupKeys.length === 0) {
      return { 
        success: false, 
        message: 'لا توجد نسخ احتياطية متاحة' 
      }
    }
    
    const lastBackupKey = backupKeys[0]
    const backupJson = localStorage.getItem(lastBackupKey)
    
    if (!backupJson) {
      return { 
        success: false, 
        message: 'فشل قراءة النسخة الاحتياطية' 
      }
    }
    
    const restored = storage.importBackup(backupJson)
    
    if (restored) {
      storage.addLog({
        type: 'info',
        message: 'تم استعادة البيانات من نسخة احتياطية',
      })
      updateSyncTimestamp()
      return { 
        success: true, 
        message: 'تم الاستعادة بنجاح' 
      }
    }
    
    return { 
      success: false, 
      message: 'فشلت عملية الاستعادة' 
    }
  } catch (error) {
    return { 
      success: false, 
      message: `خطأ في الاستعادة: ${error}` 
    }
  }
}

// تنظيف البيانات القديمة
export const cleanOldData = (daysToKeep = 90): { 
  success: boolean
  deletedAppointments: number
  deletedLogs: number
} => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    const cutoffISO = cutoffDate.toISOString().split('T')[0]
    
    // حذف المواعيد القديمة المكتملة
    const appointments = storage.getAppointments()
    const toKeep = appointments.filter(a => {
      if (a.status !== 'مكتمل') return true
      return a.date >= cutoffISO
    })
    
    const deletedAppointments = appointments.length - toKeep.length
    storage.setAppointments(toKeep)
    
    // حذف السجلات القديمة
    const logs = storage.getLogs()
    const logsToKeep = logs.filter(log => {
      const logDate = log.timestamp.split('T')[0]
      return logDate >= cutoffISO
    })
    
    const deletedLogs = logs.length - logsToKeep.length
    storage.setItem('carwash_logs', logsToKeep)
    
    if (deletedAppointments > 0 || deletedLogs > 0) {
      storage.addLog({
        type: 'info',
        message: `تم تنظيف البيانات: ${deletedAppointments} موعد، ${deletedLogs} سجل`,
      })
      updateSyncTimestamp()
    }
    
    return {
      success: true,
      deletedAppointments,
      deletedLogs,
    }
  } catch (error) {
    return {
      success: false,
      deletedAppointments: 0,
      deletedLogs: 0,
    }
  }
}

// تهيئة النظام عند أول تشغيل
export const initializeSystem = (): boolean => {
  try {
    // التحقق من توفر localStorage
    if (!storage.isLocalStorageAvailable()) {
      console.error('localStorage غير متاح')
      return false
    }
    
    // إنشاء الإعدادات الافتراضية إذا لم تكن موجودة
    const settings = storage.getSettings()
    if (!settings) {
      storage.setSettings(DEFAULT_BUSINESS_SETTINGS)
    }
    
    // التحقق من سلامة البيانات
    const validation = validateData()
    if (!validation.valid) {
      console.warn('تم اكتشاف مشاكل في البيانات:', validation.errors)
      repairData()
    }
    
    // إنشاء نسخة احتياطية
    createAutoBackup()
    
    updateSyncTimestamp()
    
    storage.addLog({
      type: 'info',
      message: 'تم تهيئة النظام بنجاح',
    })
    
    return true
  } catch (error) {
    console.error('فشل تهيئة النظام:', error)
    return false
  }
}

// مراقبة صحة النظام
export const healthCheck = (): {
  healthy: boolean
  issues: string[]
  recommendations: string[]
} => {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // حجم البيانات
  const size = storage.getStorageSize()
  if (size > 4000) { // أكثر من 4 MB
    issues.push('حجم البيانات كبير جداً')
    recommendations.push('قم بتنظيف البيانات القديمة')
  }
  
  // التحقق من السلامة
  const validation = validateData()
  if (!validation.valid) {
    issues.push(...validation.errors)
    recommendations.push('قم بإصلاح البيانات')
  }
  
  // عدد العملاء
  const customers = storage.getCustomers()
  if (customers.length === 0) {
    issues.push('لا يوجد عملاء في النظام')
    recommendations.push('قم بإضافة عملاء أو استيراد بيانات')
  }
  
  // النسخ الاحتياطية
  const allKeys = Object.keys(localStorage)
  const backupKeys = allKeys.filter(k => k.startsWith('__backup_'))
  if (backupKeys.length === 0) {
    recommendations.push('لا توجد نسخ احتياطية، قم بإنشاء نسخة الآن')
  }
  
  return {
    healthy: issues.length === 0,
    issues,
    recommendations,
  }
}
