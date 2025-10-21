// src/lib/utils/utils.ts

import { type ClassValue, clsx } from 'clsx'

// دالة مساعدة لدمج classes بذكاء (مفيدة مع Tailwind)
export const cn = (...inputs: ClassValue[]) => {
  return clsx(inputs)
}

// توليد ID فريد بسيط
export const generateId = (): number => {
  return Date.now() + Math.floor(Math.random() * 1000)
}

// توليد ID نصي قصير
export const generateShortId = (prefix = ''): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = prefix
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// تأخير (للاختبار أو المحاكاة)
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

// ترقيم الصفحات
export const paginate = <T>(
  items: T[], 
  page: number, 
  pageSize: number = 10
): { items: T[]; total: number; totalPages: number; currentPage: number } => {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  
  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    totalPages: Math.ceil(items.length / pageSize),
    currentPage: page,
  }
}

// فلترة آمنة للنصوص (بحث)
export const searchFilter = (
  text: string, 
  searchQuery: string
): boolean => {
  if (!searchQuery.trim()) return true
  
  const normalizedText = text.toLowerCase().trim()
  const normalizedQuery = searchQuery.toLowerCase().trim()
  
  return normalizedText.includes(normalizedQuery)
}

// ترتيب متعدد المعايير
export const multiSort = <T>(
  items: T[],
  sortRules: Array<{
    key: keyof T
    direction: 'asc' | 'desc'
  }>
): T[] => {
  return [...items].sort((a, b) => {
    for (const rule of sortRules) {
      const aVal = a[rule.key]
      const bVal = b[rule.key]
      
      let comparison = 0
      if (aVal < bVal) comparison = -1
      else if (aVal > bVal) comparison = 1
      
      if (comparison !== 0) {
        return rule.direction === 'asc' ? comparison : -comparison
      }
    }
    return 0
  })
}

// تجميع العناصر بحسب مفتاح
export const groupBy = <T, K extends keyof T>(
  items: T[],
  key: K
): Record<string, T[]> => {
  return items.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

// إزالة التكرارات بناءً على مفتاح
export const uniqueBy = <T, K extends keyof T>(
  items: T[],
  key: K
): T[] => {
  const seen = new Set()
  return items.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}

// عد التكرارات
export const countBy = <T, K extends keyof T>(
  items: T[],
  key: K
): Record<string, number> => {
  return items.reduce((counts, item) => {
    const value = String(item[key])
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {} as Record<string, number>)
}

// إنشاء نطاق أرقام
export const range = (start: number, end: number, step = 1): number[] => {
  const result: number[] = []
  for (let i = start; i < end; i += step) {
    result.push(i)
  }
  return result
}

// اختيار عشوائي من مصفوفة
export const randomChoice = <T>(items: T[]): T | undefined => {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

// خلط مصفوفة (Fisher-Yates)
export const shuffle = <T>(items: T[]): T[] => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// تحويل إلى عدد صحيح آمن
export const safeInt = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

// تحويل إلى عدد عشري آمن
export const safeFloat = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

// تحديد النطاقات (للرسوم البيانية)
export const getBounds = (numbers: number[]): { min: number; max: number } => {
  if (numbers.length === 0) return { min: 0, max: 0 }
  
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  }
}

// تقريب إلى أقرب عدد
export const roundTo = (number: number, decimals = 0): number => {
  const factor = Math.pow(10, decimals)
  return Math.round(number * factor) / factor
}

// نسخ عميق بسيط (للكائنات JSON)
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

// تحويل object إلى query string
export const objectToQuery = (obj: Record<string, unknown>): string => {
  const params = new URLSearchParams()
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  
  return params.toString()
}

// تحويل query string إلى object
export const queryToObject = (query: string): Record<string, string> => {
  const params = new URLSearchParams(query)
  const result: Record<string, string> = {}
  
  params.forEach((value, key) => {
    result[key] = value
  })
  
  return result
}

// capitalize أول حرف
export const capitalize = (text: string): string => {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// اقتطاع نص مع ...
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
