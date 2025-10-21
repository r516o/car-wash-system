// src/lib/algorithms/priorityCalculator.ts

import type { Customer } from '@/types/customer.types'
import type { WaitListEntry } from '@/types/emergency.types'

// حساب أولوية العميل في قائمة الانتظار
export const calculateCustomerPriority = (
  customer: Customer,
  waitingSince: string
): number => {
  let score = 0
  
  // VIP +50
  if (customer.isVIP) score += 50
  
  // قِدم العميل (كل شهر +2)
  const joinDate = new Date(customer.joinDate)
  const monthsOld = Math.floor(
    (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )
  score += Math.min(monthsOld * 2, 30) // حد أقصى 30
  
  // مدة الانتظار (كل ساعة +1)
  const waitingHours = Math.floor(
    (Date.now() - new Date(waitingSince).getTime()) / (1000 * 60 * 60)
  )
  score += Math.min(waitingHours, 20) // حد أقصى 20
  
  // رصيد منخفض +10
  if (customer.remainingWashes < 3) score += 10
  
  // حضور ممتاز +15
  if (customer.missedWashes === 0 && customer.completedWashes > 5) {
    score += 15
  }
  
  return score
}

// ترتيب قائمة الانتظار حسب الأولوية
export const sortWaitingListByPriority = (
  entries: WaitListEntry[],
  customersMap: Record<number, Customer>
): WaitListEntry[] => {
  return [...entries].sort((a, b) => {
    const customerA = customersMap[a.customerId]
    const customerB = customersMap[b.customerId]
    
    if (!customerA || !customerB) return 0
    
    const priorityA = calculateCustomerPriority(customerA, a.requestedAt)
    const priorityB = calculateCustomerPriority(customerB, b.requestedAt)
    
    return priorityB - priorityA // ترتيب تنازلي
  })
}
