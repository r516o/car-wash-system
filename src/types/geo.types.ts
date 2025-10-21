// تعريفات جغرافية عامة للنظام
// تعتمد هذه الواجهات على التوافق مع WGS84 وواجهة GeoJSON القياسية عند الحاجة

// ملاحظة: إذا كنت ستستخدم GeoJSON رسمياً، يُنصح بإضافة:
// npm i -D @types/geojson
// ثم: import type * as GeoJSON from 'geojson';

export type Coordinate = {
  // خط العرض ضمن المدى المعياري WGS84: -90 .. 90
  lat: number
  // خط الطول ضمن المدى المعياري WGS84: -180 .. 180
  lon: number
  // الارتفاع (متر) اختياري
  alt?: number
  // دقة القياس (متر) اختياري
  accuracyMeters?: number
  // دقة الارتفاع (متر) اختياري
  altitudeAccuracyMeters?: number
  // السرعة م/ث اختياري
  speedMps?: number
  // الاتجاه (Bearing) بالدرجات 0..360 اختياري
  bearingDeg?: number
}

export interface Address {
  formatted?: string
  country?: string
  city?: string
  district?: string
  street?: string
  building?: string
  postalCode?: string
}

export interface GeoPoint {
  coordinate: Coordinate
  address?: Address
  // منطقة تشغيل (zone) إن وجدت
  zoneId?: string
  // ختم زمني للحصول/التحديث
  timestamp?: string // ISO
}

export interface GeoBounds {
  // صندوق إحاطة: جنوب-غرب إلى شمال-شرق
  southWest: Coordinate
  northEast: Coordinate
}

export interface Zone {
  id: string
  name: string
  description?: string
  // تمثيل المنطقة كسياج جغرافي
  fence: GeoFence
  // حدود تقريبية لصندوق الإحاطة لتسريع الفحص
  bounds?: GeoBounds
  // أولوية المنطقة (للمسارات/التوزيع)
  priority?: number
  // سعة المنطقة اليومية النظرية
  dailyCapacityHint?: number
  // بيانات إضافية
  metadata?: Record<string, unknown>
}

export type GeoFenceType = 'circle' | 'polygon'

// سياج جغرافي بسيط
export interface GeoFence {
  type: GeoFenceType
  // دائرة: مركز + نصف قطر (متر)
  circle?: {
    center: Coordinate
    radiusMeters: number
  }
  // مضلع: قائمة نقاط (lat, lon) بالترتيب
  polygon?: {
    // على الأقل 3 نقاط لتكوين مضلع
    coordinates: Coordinate[]
    // هل هو مغلق (النقطة الأخيرة = الأولى)؟ إذا لم يكن كذلك يمكن إغلاقه برمجياً
    closed?: boolean
  }
}

export interface RouteWaypoint {
  id?: string
  name?: string
  point: GeoPoint
  // زمن خدمة عند التوقف (ثوانٍ)
  serviceDurationSec?: number
  // نافذة زمنية اختيارية للوصول
  timeWindow?: { from: string; to: string } // ISO
}

export interface RouteLeg {
  from: RouteWaypoint
  to: RouteWaypoint
  // المسافة بالمتر
  distanceMeters: number
  // الزمن بالثواني (تقديري)
  durationSec: number
  // بوليلاين مشفر أو سلسلة نقاط مبسطة
  geometry?: {
    // ترميز polyline أو قائمة نقاط
    polylineEncoded?: string
    points?: Coordinate[]
  }
}

export interface RoutePlan {
  id: string
  waypoints: RouteWaypoint[]
  legs: RouteLeg[]
  totalDistanceMeters: number
  totalDurationSec: number
  // هل تم تحسين الترتيب؟
  optimized?: boolean
  // قيود التحسين (اختياري)
  constraints?: {
    // أقصى زمن مسموح للمسار (ثوانٍ)
    maxDurationSec?: number
    // أقصى مسافة مسموحة (متر)
    maxDistanceMeters?: number
    // احترام النوافذ الزمنية إن وجدت
    respectTimeWindows?: boolean
  }
  // ملاحظات أو أسباب الترتيب
  notes?: string
}

export interface DistanceMatrixCell {
  fromIndex: number
  toIndex: number
  distanceMeters: number
  durationSec: number
}

export interface DistanceMatrix {
  // ترتيب العقد يطابق indices
  points: GeoPoint[]
  // مصفوفة مسافات/أزمنة مسطحة أو 2D
  matrix: DistanceMatrixCell[]
  // أو تمثيل 2D (اختياري) إذا رغبت
  // matrix2D?: { distanceMeters: number; durationSec: number }[][]
  computedAt: string // ISO
  method?: 'haversine' | 'graph' | 'api'
}

export interface GeoOptimizationRequest {
  // نقاط يجب زيارتها
  waypoints: RouteWaypoint[]
  // نقطة بداية/نهاية اختيارية (depot)
  start?: RouteWaypoint
  end?: RouteWaypoint
  // تفضيلات
  preferences?: {
    minimize: 'distance' | 'time'
    avoidZones?: string[] // معرّفات مناطق لتجنبها
    preferredZones?: string[] // مناطق مفضلة
  }
  // حدود
  limits?: {
    maxWaypoints?: number
    maxDistanceMeters?: number
    maxDurationSec?: number
  }
}

export interface GeoOptimizationResult {
  success: boolean
  plan?: RoutePlan
  message?: string
  warnings?: string[]
  computedAt: string // ISO
}

// كائنات GeoJSON اختيارية إذا أردت التعامل مع شكل معياري
// قم بفك التعليق عند تثبيت @types/geojson
/*
import type { Geometry, Feature, FeatureCollection, Position } from 'geojson'

export type GeoJSONFeature = Feature<Geometry, Record<string, unknown>>
export type GeoJSONFeatureCollection = FeatureCollection<Geometry, Record<string, unknown>>

export interface GeoJSONBinding {
  feature?: GeoJSONFeature
  featureCollection?: GeoJSONFeatureCollection
}
*/

// أدوات بسيطة للفلاتر/الاستعلامات الجغرافية
export interface GeoFilters {
  withinBounds?: GeoBounds
  withinZoneIds?: string[]
  near?: { center: Coordinate; radiusMeters: number }
}

// تحقق أساسي من النطاقات (للاستخدام في أماكن التحقق من القيم)
export const isValidLatLon = (lat: number, lon: number): boolean => {
  const latOk = lat >= -90 && lat <= 90
  const lonOk = lon >= -180 && lon <= 180
  return latOk && lonOk
}
