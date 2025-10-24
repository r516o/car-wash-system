// src/App.tsx — نسخة محسّنة تمنع التجمّد وتدعم الإغلاق السلس
import { useState, useEffect } from 'react'
import './App.css'
import * as storage from './lib/storage/localStorage'
import * as dataManager from './lib/storage/dataManager'
import { generateInitialData } from './lib/data/dataGenerator'
import { generateBulkSchedule } from './lib/algorithms/autoScheduler'
import type { Customer } from './types/customer.types'
import type { Appointment } from './types/appointment.types'

// SVG Icons
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
const IconZap = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IconRefresh = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 7a8 8 0 10.25 5H17m3 0V7h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IconBack = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
const IconCalendar = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
const IconX = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>

type Role = 'selection' | 'employee' | 'manager'

export default function App() {
  const [role, setRole] = useState<Role>('selection')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showAutoScheduler, setShowAutoScheduler] = useState(false)
  const [schedulingProgress, setSchedulingProgress] = useState('')
  const [closingWithEsc, setClosingWithEsc] = useState(false)

  useEffect(() => {
    let c = storage.getCustomers()
    let a = storage.getAppointments()
    if (c.length === 0) {
      const init = generateInitialData()
      storage.setCustomers(init.customers)
      storage.setAppointments(init.appointments)
      c = init.customers
      a = init.appointments
    }
    setCustomers(c)
    setAppointments(a)
    setLoading(false)
  }, [])

  // منع تمرير الخلفية + دعم زر Escape
  useEffect(() => {
    const hasModal = showAddCustomer || showAutoScheduler
    if (hasModal) document.body.classList.add('modal-open')
    else document.body.classList.remove('modal-open')

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setClosingWithEsc(true)
        setShowAddCustomer(false)
        setShowAutoScheduler(false)
        setTimeout(() => setClosingWithEsc(false), 100)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [showAddCustomer, showAutoScheduler])

  const reload = () => {
    setCustomers(storage.getCustomers())
    setAppointments(storage.getAppointments())
  }

  // جدولة بدُفعات لمنع تجميد الواجهة
  const handleAutoSchedule = async () => {
    setSchedulingProgress('🔄 جاري الجدولة...')
    const year = new Date().getFullYear()
    const month = new Date().getMonth() + 1
    const batchSize = 15
    let totalScheduled = 0
    let totalFailed = 0
    let processed = 0
    // نعمل على قائمة مواعيد محلية لتراكم النتائج بين الدُفعات
    let currentAppointments = [...appointments]

    try {
      for (let i = 0; i < customers.length; i += batchSize) {
        // إتاحة “نبضة” للمتصفح قبل كل دفعة
        await new Promise((r) => setTimeout(r, 0))
        const batch = customers.slice(i, i + batchSize)
        const res = generateBulkSchedule(batch, year, month, currentAppointments)
        const newApts = res.results.flatMap(r => r.result.schedule)
        if (newApts.length) {
          storage.addAppointments(newApts)
          currentAppointments.push(...newApts)
          totalScheduled += newApts.length
          reload()
        }
        totalFailed += res.totalFailed
        processed = Math.min(i + batchSize, customers.length)
        setSchedulingProgress(`جاري الجدولة... ${processed}/${customers.length}`)
      }
      setSchedulingProgress(`✅ تم جدولة ${totalScheduled} موعد، فشل ${totalFailed}`)
    } catch (err) {
      console.error(err)
      setSchedulingProgress('❌ حدث خطأ أثناء الجدولة')
    } finally {
      // إغلاق تلقائي بعد ثانيتين
      setTimeout(() => {
        setShowAutoScheduler(false)
        setSchedulingProgress('')
      }, 2000)
    }
  }

  const handleStatusChange = (id: number, newStatus: 'مكتمل' | 'غائب') => {
    if (newStatus === 'مكتمل') dataManager.completeAppointmentAndUpdateCustomer(id)
    else dataManager.markAppointmentMissed(id)
    reload()
  }

  const todayISO = new Date().toISOString().split('T')[0]
  const today = appointments.filter(a => a.date === todayISO)
  const completed = today.filter(a => a.status === 'مكتمل').length
  const missed = today.filter(a => a.status === 'غائب').length
  const remaining = today.length - completed - missed

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-text">جاري التحميل...</p>
      </div>
    )
  }

  if (role === 'selection') {
    return (
      <div className="role-selection-page">
        <div className="role-container">
          <div className="role-header">
            <div className="role-icon">🚗</div>
            <h1 className="role-title">نظام إدارة غسيل السيارات المتنقل</h1>
            <p className="role-subtitle">نأتي إليك أينما كنت - خدمة احترافية متميزة</p>
          </div>
          <div className="role-cards">
            <div className="role-card" onClick={() => setRole('employee')}>
              <div className="role-card-icon">👨‍💼</div>
              <h3 className="role-card-title">دخول الموظف</h3>
              <p className="role-card-desc">إدارة المواعيد اليومية وتتبع حالة الغسلات</p>
              <ul className="role-card-features">
                <li>✅ عرض مواعيد اليوم</li>
                <li>✅ تحديث حالة الغسلات</li>
                <li>✅ إعادة جدولة المواعيد</li>
                <li>✅ إحصائيات سريعة</li>
              </ul>
            </div>
            <div className="role-card" onClick={() => setRole('manager')}>
              <div className="role-card-icon">👨‍💻</div>
              <h3 className="role-card-title">دخول المدير</h3>
              <p className="role-card-desc">إدارة شاملة للنظام والعملاء والتقارير</p>
              <ul className="role-card-features role-card-features-manager">
                <li>✅ لوحة معلومات شاملة</li>
                <li>✅ إدارة العملاء</li>
                <li>✅ الجدول الشهري</li>
                <li>✅ التقارير والإحصائيات</li>
              </ul>
            </div>
          </div>
          <p className="role-footer">اختر الدور المناسب للوصول للنظام</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">🚗</div>
            <div className="header-title">
              <h1>نظام غسيل السيارات</h1>
              <p className="header-subtitle">{role === 'employee' ? 'لوحة الموظف' : 'لوحة المدير'}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-date">
              <span className="date-icon"><IconCalendar /></span>
              <span>{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <button className="header-btn btn-refresh" onClick={reload} type="button">
              <span className="btn-icon"><IconRefresh /></span>
              <span className="btn-text">تحديث</span>
            </button>
            <button className="header-btn btn-switch" onClick={() => setRole(role === 'employee' ? 'manager' : 'employee')} type="button">
              <span className="btn-icon">🔀</span>
              <span className="btn-text">{role === 'employee' ? 'المدير' : 'الموظف'}</span>
            </button>
            <button className="header-btn btn-back" onClick={() => setRole('selection')} type="button">
              <span className="btn-icon"><IconBack /></span>
              <span className="btn-text">رجوع</span>
            </button>
            <button className="header-btn btn-add" onClick={() => setShowAddCustomer(true)} type="button">
              <span className="btn-icon"><IconPlus /></span>
              <span className="btn-text">إضافة عميل</span>
            </button>
            <button className="header-btn btn-auto" onClick={() => setShowAutoScheduler(true)} type="button">
              <span className="btn-icon"><IconZap /></span>
              <span className="btn-text">جدولة تلقائية</span>
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="stats-container">
          <div className="stat-box stat-primary">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">مواعيد اليوم</div>
              <div className="stat-value">{today.length}</div>
            </div>
          </div>
          <div className="stat-box stat-success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-label">المكتملة</div>
              <div className="stat-value">{completed}</div>
            </div>
          </div>
          <div className="stat-box stat-warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-label">المتبقية</div>
              <div className="stat-value">{remaining}</div>
            </div>
          </div>
          <div className="stat-box stat-danger">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-label">الغائبون</div>
              <div className="stat-value">{missed}</div>
            </div>
          </div>
        </div>

        <div className="appointments-section">
          <div className="section-header">
            <h2 className="section-title"><span className="title-icon">📋</span>مواعيد اليوم</h2>
            <div className="section-info">
              <span className="info-badge">{today.length} موعد</span>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>اسم العميل</th>
                  <th>نوع السيارة</th>
                  <th>حجم السيارة</th>
                  <th>رقم الجوال</th>
                  <th>الغسلة رقم</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {today.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      <div className="empty-icon">📭</div>
                      <p>لا توجد مواعيد لهذا اليوم</p>
                    </td>
                  </tr>
                ) : (
                  today.map(a => (
                    <tr key={a.id} className="table-row">
                      <td className="td-time">{a.time}</td>
                      <td className="td-name">{a.customerName}</td>
                      <td className="td-car">{a.carType}</td>
                      <td className="td-size">{a.carSize}</td>
                      <td className="td-phone">{a.phone}</td>
                      <td className="td-wash">#{a.washNumber}</td>
                      <td className="td-status">
                        <span className={`status-pill ${
                          a.status === 'مكتمل' ? 'status-completed' :
                          a.status === 'غائب' ? 'status-missed' : 'status-scheduled'
                        }`}>{a.status}</span>
                      </td>
                      <td className="td-actions">
                        {a.status === 'قادم' && (
                          <>
                            <button className="action-btn btn-complete" onClick={() => handleStatusChange(a.id, 'مكتمل')} title="اكتمل" type="button">✓</button>
                            <button className="action-btn btn-miss" onClick={() => handleStatusChange(a.id, 'غائب')} title="غائب" type="button">✗</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h3 className="info-title">📊 إحصائيات سريعة</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">إجمالي العملاء</span>
                <span className="info-value">{customers.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">إجمالي المواعيد</span>
                <span className="info-value">{appointments.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">معدل الإنجاز</span>
                <span className="info-value">{today.length ? Math.round((completed / today.length) * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Add Customer */}
      {showAddCustomer && (
        <div className="modal" onClick={() => setShowAddCustomer(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">إضافة عميل جديد</h3>
              <button className="modal-close" onClick={() => setShowAddCustomer(false)} type="button">
                <IconX />
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم العميل</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="أدخل اسم العميل" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
                  <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="05XXXXXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع السيارة</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="مثال: تويوتا كامري" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">حجم السيارة</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option>صغيرة</option>
                    <option>متوسطة</option>
                    <option>كبيرة</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="header-btn btn-add" type="button" onClick={() => { alert('سيتم حفظ العميل هنا'); setShowAddCustomer(false) }}>
                حفظ العميل
              </button>
              <button className="header-btn btn-back" type="button" onClick={() => setShowAddCustomer(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Auto Scheduler */}
      {showAutoScheduler && (
        <div className="modal" onClick={() => setShowAutoScheduler(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">الجدولة التلقائية</h3>
              <button className="modal-close" type="button" onClick={() => setShowAutoScheduler(false)}>
                <IconX />
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 font-semibold mb-2">📅 جدولة {customers.length} عميل</p>
                  <p className="text-blue-600 text-sm">الشهر: {new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</p>
                </div>
                {schedulingProgress && <div className="alert-info">{schedulingProgress}</div>}
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <p className="mb-2">ℹ️ ملاحظات:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>سيتم توزيع 10 غسلات لكل عميل</li>
                    <li>الفارق بين الغسلات: 3 أيام</li>
                    <li>مراعاة الأيام المفضلة</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="header-btn btn-auto" type="button" onClick={handleAutoSchedule} disabled={!!schedulingProgress}>
                {schedulingProgress ? 'جاري الجدولة...' : 'بدء الجدولة'}
              </button>
              <button className="header-btn btn-back" type="button" onClick={() => { setShowAutoScheduler(false); setSchedulingProgress('') }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
