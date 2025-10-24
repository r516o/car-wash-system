/**
 * Crisis Manager - نظام إدارة الأزمات المتكامل
 * يعالج جميع سيناريوهات الطوارئ: الغياب الجماعي، قوائم الانتظار، التعويض التلقائي
 */

import type { Appointment } from '../../types/appointment.types';
import type { Customer } from '../../types/customer.types';

export interface CrisisEvent {
  type: 'mass_absence' | 'urgent_request' | 'peak_demand' | 'system_overload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedCount: number;
  timestamp: Date;
  details: any;
}

export interface EmergencyPlan {
  detectedAt: Date;
  crisisType: string;
  affectedAppointments: number[];
  recoveryActions: RecoveryAction[];
  estimatedRecoveryTime: number;
  successRate: number;
  compensations: Compensation[];
}

export interface RecoveryAction {
  action: 'reschedule' | 'notify' | 'compensate' | 'waitlist';
  targetIds: number[];
  priority: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Compensation {
  customerId: number;
  type: 'free_wash' | 'priority_booking' | 'discount';
  value: number;
  reason: string;
}

export interface WaitingListEntry {
  customerId: number;
  customerName: string;
  phone: string;
  preferredDate?: string;
  preferredTime?: string;
  priority: number;
  addedAt: Date;
  notified: boolean;
}

/**
 * اكتشاف الغياب الجماعي خلال 5 دقائق
 */
export function detectMassAbsence(
  appointments: Appointment[],
  currentTime: Date = new Date()
): { isAbsence: boolean; absentIds: number[]; severity: string } {
  const todayISO = currentTime.toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todayISO);
  
  // التحقق من المواعيد التي مر عليها 5 دقائق ولم تكتمل
  const absentIds: number[] = [];
  const now = currentTime.getTime();
  
  todayAppointments.forEach(apt => {
    if (apt.status === 'قادم') {
      const [hours, minutes] = apt.time.split(':').map(Number);
      const aptTime = new Date(currentTime);
      aptTime.setHours(hours, minutes, 0, 0);
      
      const diffMinutes = (now - aptTime.getTime()) / (1000 * 60);
      
      // إذا مر 5 دقائق على الموعد ولم يكتمل = غياب
      if (diffMinutes >= 5) {
        absentIds.push(apt.id);
      }
    }
  });
  
  const absenceRate = absentIds.length / Math.max(todayAppointments.length, 1);
  
  let severity = 'low';
  if (absenceRate > 0.5) severity = 'critical'; // 50%+
  else if (absenceRate > 0.3) severity = 'high';
  else if (absenceRate > 0.15) severity = 'medium';
  
  return {
    isAbsence: absentIds.length > 0,
    absentIds,
    severity
  };
}

/**
 * معالجة أزمة الغياب الجماعي
 */
export function handleMassAbsence(
  absentIds: number[],
  appointments: Appointment[],
  customers: Customer[],
  waitingList: WaitingListEntry[]
): EmergencyPlan {
  const now = new Date();
  const recoveryActions: RecoveryAction[] = [];
  const compensations: Compensation[] = [];
  
  // 1. تحديد المواعيد المتأثرة
  const affectedAppointments = appointments.filter(a => absentIds.includes(a.id));
  
  // 2. تحرير الفراغات الناتجة عن الغياب
  const freedSlots = affectedAppointments.map(a => ({
    date: a.date,
    time: a.time,
    duration: a.carSize === 'كبيرة' ? 25 : 15
  }));
  
  // 3. تفعيل قائمة الانتظار
  const sortedWaitlist = [...waitingList].sort((a, b) => b.priority - a.priority);
  const notifiedCustomers: number[] = [];
  
  freedSlots.forEach((slot, index) => {
    if (sortedWaitlist[index] && !sortedWaitlist[index].notified) {
      notifiedCustomers.push(sortedWaitlist[index].customerId);
      sortedWaitlist[index].notified = true;
    }
  });
  
  recoveryActions.push({
    action: 'waitlist',
    targetIds: notifiedCustomers,
    priority: 1,
    status: 'completed'
  });
  
  // 4. إعادة جدولة للعملاء الغائبين
  const rescheduledIds = affectedAppointments.map(a => a.customerId);
  recoveryActions.push({
    action: 'reschedule',
    targetIds: rescheduledIds,
    priority: 2,
    status: 'pending'
  });
  
  // 5. تعويض للعملاء المتأثرين من قائمة الانتظار
  affectedAppointments.forEach(apt => {
    const customer = customers.find(c => c.id === apt.customerId);
    if (customer && customer.stats.missedWashes >= 2) {
      compensations.push({
        customerId: customer.id,
        type: 'free_wash',
        value: 1,
        reason: 'تعويض عن الغياب المتكرر'
      });
    }
  });
  
  const successRate = (notifiedCustomers.length / Math.max(freedSlots.length, 1)) * 100;
  
  return {
    detectedAt: now,
    crisisType: 'mass_absence',
    affectedAppointments: absentIds,
    recoveryActions,
    estimatedRecoveryTime: 10, // 10 دقائق
    successRate,
    compensations
  };
}

/**
 * إيجاد فراغات مستعجلة خارج أوقات العمل
 */
export function findUrgentSlots(
  appointments: Appointment[],
  requestDate: string,
  count: number = 1
): { time: string; available: boolean }[] {
  const morningSlots = generateTimeSlots('07:00', '12:00', 15);
  const eveningSlots = generateTimeSlots('13:00', '19:00', 15);
  const allSlots = [...morningSlots, ...eveningSlots];
  
  const bookedTimes = appointments
    .filter(a => a.date === requestDate)
    .map(a => a.time);
  
  const availableSlots = allSlots
    .filter(time => !bookedTimes.includes(time))
    .map(time => ({ time, available: true }))
    .slice(0, count);
  
  return availableSlots;
}

/**
 * إدارة ذروة الطلب (50 عميل إضافي)
 */
export function handlePeakDemand(
  newRequests: number,
  currentCapacity: number,
  maxDailyCapacity: number = 33
): {
  accepted: number;
  waitlisted: number;
  nextMonth: number;
  recommendation: string;
} {
  const available = maxDailyCapacity - currentCapacity;
  
  let accepted = 0;
  let waitlisted = 0;
  let nextMonth = 0;
  
  if (available > 0) {
    accepted = Math.min(newRequests, available);
    const remaining = newRequests - accepted;
    
    // توزيع الباقي
    waitlisted = Math.min(remaining, 10); // قائمة انتظار محدودة
    nextMonth = remaining - waitlisted;
  } else {
    nextMonth = newRequests;
  }
  
  const recommendation = 
    accepted === newRequests
      ? 'يمكن استيعاب جميع الطلبات'
      : waitlisted > 0
      ? `تم إضافة ${waitlisted} لقائمة الانتظار و${nextMonth} للشهر القادم`
      : `تحويل ${nextMonth} طلب للشهر القادم`;
  
  return { accepted, waitlisted, nextMonth, recommendation };
}

/**
 * إنشاء قائمة انتظار ذكية
 */
export function manageWaitingList(
  entries: WaitingListEntry[],
  availableSlots: { date: string; time: string }[]
): { matched: number; notified: number[] } {
  const sorted = [...entries]
    .filter(e => !e.notified)
    .sort((a, b) => b.priority - a.priority);
  
  const notified: number[] = [];
  
  availableSlots.forEach((slot, index) => {
    if (sorted[index]) {
      notified.push(sorted[index].customerId);
    }
  });
  
  return {
    matched: notified.length,
    notified
  };
}

// Helper: توليد فترات زمنية
function generateTimeSlots(start: string, end: string, interval: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let current = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  while (current < endMinutes) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    current += interval;
  }
  
  return slots;
}
