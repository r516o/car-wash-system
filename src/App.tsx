// src/App.tsx
import { useState, useEffect } from 'react'
import './App.css'
import * as storage from './lib/storage/localStorage'
import { generateInitialData } from './lib/data/dataGenerator'

function App() {
    const [role, setRole] = useState<'selection' | 'employee' | 'manager'>('selection')
    const [appointments, setAppointments] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = () => {
        let existingCustomers = storage.getCustomers()
        let existingAppointments = storage.getAppointments()

        if (existingCustomers.length === 0) {
            const { customers: newCustomers, appointments: newAppointments } = generateInitialData()
            storage.setCustomers(newCustomers)
            storage.setAppointments(newAppointments)
            existingCustomers = newCustomers
            existingAppointments = newAppointments
        }

        setCustomers(existingCustomers)
        setAppointments(existingAppointments)
        setLoading(false)
    }

    const todayDate = new Date().toISOString().split('T')[0]
    const todayAppointments = appointments.filter(a => a.date === todayDate)
    const completed = todayAppointments.filter(a => a.status === 'مكتمل').length
    const missed = todayAppointments.filter(a => a.status === 'غائب').length
    const remaining = todayAppointments.length - completed - missed

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p className="loading-text">جاري التحميل...</p>
            </div>
        )
    }

    // صفحة اختيار الدور
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
                        {/* بطاقة الموظف */}
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

                        {/* بطاقة المدير */}
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

    // لوحة التحكم
    return (
        <div className="dashboard-page">
            {/* الهيدر */}
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
                            <span className="date-icon">📅</span>
                            <span>{new Date().toLocaleDateString('ar-SA', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>
                        <button className="header-btn btn-refresh" onClick={() => loadData()}>
                            <span className="btn-icon">🔄</span>
                            <span className="btn-text">تحديث</span>
                        </button>
                        <button className="header-btn btn-switch" onClick={() => setRole(role === 'employee' ? 'manager' : 'employee')}>
                            <span className="btn-icon">🔀</span>
                            <span className="btn-text">{role === 'employee' ? 'المدير' : 'الموظف'}</span>
                        </button>
                        <button className="header-btn btn-back" onClick={() => setRole('selection')}>
                            <span className="btn-icon">◀️</span>
                            <span className="btn-text">رجوع</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* المحتوى الرئيسي */}
            <main className="dashboard-main">
                {/* بطاقات الإحصائيات */}
                <div className="stats-container">
                    <div className="stat-box stat-primary">
                        <div className="stat-icon">📅</div>
                        <div className="stat-content">
                            <div className="stat-label">مواعيد اليوم</div>
                            <div className="stat-value">{todayAppointments.length}</div>
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

                {/* جدول المواعيد */}
                <div className="appointments-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="title-icon">📋</span>
                            مواعيد اليوم
                        </h2>
                        <div className="section-info">
                            <span className="info-badge">{todayAppointments.length} موعد</span>
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
                                {todayAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="empty-state">
                                            <div className="empty-icon">📭</div>
                                            <p>لا توجد مواعيد لهذا اليوم</p>
                                        </td>
                                    </tr>
                                ) : (
                                    todayAppointments.map((apt) => (
                                        <tr key={apt.id} className="table-row">
                                            <td className="td-time">{apt.time}</td>
                                            <td className="td-name">{apt.customerName}</td>
                                            <td className="td-car">{apt.carType}</td>
                                            <td className="td-size">{apt.carSize}</td>
                                            <td className="td-phone">{apt.phone}</td>
                                            <td className="td-wash">#{apt.washNumber}</td>
                                            <td className="td-status">
                                                <span className={`status-pill status-${apt.status === 'مكتمل' ? 'completed' :
                                                        apt.status === 'غائب' ? 'missed' :
                                                            'scheduled'
                                                    }`}>
                                                    {apt.status}
                                                </span>
                                            </td>
                                            <td className="td-actions">
                                                <button className="action-btn btn-complete" title="اكتمل">✓</button>
                                                <button className="action-btn btn-miss" title="غائب">✗</button>
                                                <button className="action-btn btn-reschedule" title="إعادة جدولة">↻</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* معلومات إضافية */}
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
                                <span className="info-value">
                                    {todayAppointments.length > 0 ? Math.round((completed / todayAppointments.length) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default App
