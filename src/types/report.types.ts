// تعريفات التقارير والمؤشرات والتصدير

import type { AppointmentStatus, Period } from './appointment.types'
import type { DayOfWeek } from './customer.types'

export type ReportGranularity = 'daily' | 'weekly' | 'monthly' | 'custom'
export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf'

export interface KPI {
  key: string            // المعرف الداخلي (مثال: attendance_rate)
  label: string          // الاسم المعروض (مثال: معدل الحضور)
  value: number          // القيمة الرقمية
  unit?: string          // وحدة القياس (%, SAR, count)
  trend?: number         // نسبة التغير مقارنة بالفترة السابقة
  target?: number        // الهدف المطلوب
  higherIsBetter?: boolean // اتجاه التحسن
}

export interface DimensionSlice {
  name: string           // اسم البُعد (مثال: period)
  value: string          // القيمة (صباحي/مسائي)
  count: number          // العدد
  percentage?: number    // النسبة %
}

export interface SeriesPoint {
  x: string | number | Date // المحور السيني (تاريخ/يوم/أسبوع)
  y: number                 // القيمة
  extra?: Record<string, unknown> // بيانات إضافية
}

export interface ChartSeries {
  id: string
  label: string
  points: SeriesPoint[]
  color?: string
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'radar'
  title?: string
  series: ChartSeries[]
  categories?: Array<string | number | Date>
}

export interface DailyReport {
  granularity: 'daily'
  date: string                 // YYYY-MM-DD
  kpis: KPI[]
  totals: {
    scheduled: number
    completed: number
    missed: number
    rescheduled: number
    revenue: number
    attendanceRate: number     // %
  }
  byPeriod: Array<{
    period: Period
    scheduled: number
    completed: number
    missed: number
    revenue: number
  }>
  byStatus: Array<{
    status: AppointmentStatus
    count: number
  }>
  byCarSize: Array<{
    size: 'صغيرة' | 'كبيرة'
    count: number
    revenue: number
  }>
  timeDistribution: ChartData  // توزيع حسب الأوقات
}

export interface WeeklyReport {
  granularity: 'weekly'
  weekNumber: number
  year: number
  range: { from: string; to: string }
  kpis: KPI[]
  dailyBreakdown: Array<{
    date: string
    scheduled: number
    completed: number
    missed: number
    revenue: number
    attendanceRate: number
  }>
  performanceChart: ChartData
}

export interface MonthlyReport {
  granularity: 'monthly'
  month: number                // 1..12
  year: number
  kpis: KPI[]
  totals: {
    scheduled: number
    completed: number
    missed: number
    rescheduled: number
    revenue: number
    averageDaily: number
    attendanceRate: number
  }
  byDayOfWeek: Array<{
    day: DayOfWeek
    scheduled: number
    completed: number
    missed: number
    revenue: number
  }>
  weeklyAggregation: Array<{
    weekNumber: number
    scheduled: number
    completed: number
    missed: number
    revenue: number
  }>
  charts: {
    attendanceTrend: ChartData
    revenueTrend: ChartData
    statusDistribution: ChartData
  }
}

export interface CustomReport {
  granularity: 'custom'
  title: string
  description?: string
  range: { from: string; to: string }
  filters?: {
    period?: Period
    status?: AppointmentStatus
    carSize?: 'صغيرة' | 'كبيرة'
    day?: DayOfWeek
  }
  kpis: KPI[]
  table: {
    headers: string[]
    rows: Array<Array<string | number>>
  }
  charts?: ChartData[]
}

export type AnyReport = DailyReport | WeeklyReport | MonthlyReport | CustomReport

// إعدادات طلب إنشاء تقرير
export interface ReportRequest {
  granularity: ReportGranularity
  range?: { from: string; to: string }
  month?: number
  year?: number
  filters?: {
    period?: Period
    status?: AppointmentStatus
    day?: DayOfWeek
    carSize?: 'صغيرة' | 'كبيرة'
    search?: string
  }
  includeCharts?: boolean
  locale?: 'ar' | 'en'
}

// نتيجة إنشاء تقرير
export interface ReportResult<T extends AnyReport = AnyReport> {
  success: boolean
  report?: T
  message?: string
  warnings?: string[]
  generatedAt: string
  tookMs?: number
}

// تعريفات التصدير
export interface ExportOptions {
  format: ExportFormat
  fileName?: string              // مثال: monthly_report_2025_10
  includeHeaders?: boolean       // رؤوس الأعمدة في CSV/Excel
  delimiter?: string             // للفورمات CSV (افتراضي ,)
  encoding?: 'utf-8' | 'utf-16'  // الترميز
  sheetName?: string             // لملفات Excel
}

export interface ExportPayload {
  meta: {
    title: string
    createdAt: string
    range?: { from: string; to: string }
    granularity: ReportGranularity
  }
  kpis?: KPI[]
  table?: {
    headers: string[]
    rows: Array<Array<string | number>>
  }
  charts?: ChartData[]
}

// بنية عنصر صف قياسي للتصدير الجدولي
export interface FlatRow {
  date: string
  period: Period
  status: AppointmentStatus
  customerName: string
  phone: string
  carType: string
  carSize: 'صغيرة' | 'كبيرة'
  revenue: number
}

// معايير جودة المقاييس (للدقة والاتساق)
export interface MetricQualityRule {
  id: string
  name: string
  description: string
  checks: Array<{
    type: 'quantifiable' | 'consistent' | 'actionable' | 'relevant' | 'timely' | 'simple'
    passed: boolean
    details?: string
  }>
}
