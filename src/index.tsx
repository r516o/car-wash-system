import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'

// Import route modules
import { customerRoutes } from './routes/customers'
import { appointmentRoutes } from './routes/appointments'
import { schedulingRoutes } from './routes/scheduling'
import { subscriptionRoutes } from './routes/subscriptions'
import { employeeRoutes } from './routes/employees'
import { analyticsRoutes } from './routes/analytics'
import { notificationRoutes } from './routes/notifications'

// Types
export type Bindings = {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  JWT_SECRET: string
  GOOGLE_MAPS_API_KEY: string
  FIREBASE_SERVER_KEY: string
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  TWILIO_PHONE_NUMBER: string
  STRIPE_SECRET_KEY: string
  SENDGRID_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API Routes
app.route('/api/customers', customerRoutes)
app.route('/api/appointments', appointmentRoutes)
app.route('/api/scheduling', schedulingRoutes)
app.route('/api/subscriptions', subscriptionRoutes)
app.route('/api/employees', employeeRoutes)
app.route('/api/analytics', analyticsRoutes)
app.route('/api/notifications', notificationRoutes)

// Admin dashboard
app.get('/admin/*', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>نظام إدارة مغسلة السيارات المتنقلة</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
            body { font-family: 'Tajawal', sans-serif; }
            .rtl { direction: rtl; }
            .ltr { direction: ltr; }
            .gradient-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card-shadow {
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .hover-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
            .status-badge {
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.75rem;
                font-weight: 500;
            }
            .status-active { background-color: #10b981; color: white; }
            .status-pending { background-color: #f59e0b; color: white; }
            .status-completed { background-color: #3b82f6; color: white; }
            .status-cancelled { background-color: #ef4444; color: white; }
            .loading-spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .modal-content {
                background: white;
                border-radius: 0.5rem;
                padding: 2rem;
                max-width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
            }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="app">
            <nav class="gradient-bg text-white p-4">
                <div class="container mx-auto flex justify-between items-center">
                    <h1 class="text-2xl font-bold">
                        <i class="fas fa-car mr-2"></i>
                        نظام إدارة مغسلة السيارات المتنقلة
                    </h1>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm">مرحباً، المدير</span>
                        <button class="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition">
                            <i class="fas fa-sign-out-alt ml-2"></i>
                            تسجيل الخروج
                        </button>
                    </div>
                </div>
            </nav>

            <div class="container mx-auto p-6">
                <!-- Statistics Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg p-6 card-shadow hover-card transition duration-300">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">العملاء النشطون</p>
                                <p class="text-2xl font-bold text-gray-800" id="activeCustomers">0</p>
                            </div>
                            <div class="bg-blue-100 p-3 rounded-full">
                                <i class="fas fa-users text-blue-600 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg p-6 card-shadow hover-card transition duration-300">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">المواعيد اليوم</p>
                                <p class="text-2xl font-bold text-gray-800" id="todayAppointments">0</p>
                            </div>
                            <div class="bg-green-100 p-3 rounded-full">
                                <i class="fas fa-calendar-check text-green-600 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg p-6 card-shadow hover-card transition duration-300">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">الإيرادات الشهرية</p>
                                <p class="text-2xl font-bold text-gray-800" id="monthlyRevenue">0 ر.س</p>
                            </div>
                            <div class="bg-yellow-100 p-3 rounded-full">
                                <i class="fas fa-chart-line text-yellow-600 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg p-6 card-shadow hover-card transition duration-300">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-500 text-sm">متوسط التقييم</p>
                                <p class="text-2xl font-bold text-gray-800" id="averageRating">0.0</p>
                            </div>
                            <div class="bg-purple-100 p-3 rounded-full">
                                <i class="fas fa-star text-purple-600 text-xl"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Quick Actions -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-lg p-6 card-shadow">
                            <h2 class="text-xl font-bold text-gray-800 mb-4">إجراءات سريعة</h2>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition text-center" onclick="showAddCustomerModal()">
                                    <i class="fas fa-user-plus text-2xl mb-2"></i>
                                    <p class="text-sm">إضافة عميل</p>
                                </button>
                                <button class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition text-center" onclick="showScheduleModal()">
                                    <i class="fas fa-calendar-plus text-2xl mb-2"></i>
                                    <p class="text-sm">جدولة موعد</p>
                                </button>
                                <button class="bg-yellow-600 text-white p-4 rounded-lg hover:bg-yellow-700 transition text-center" onclick="showReportsModal()">
                                    <i class="fas fa-chart-bar text-2xl mb-2"></i>
                                    <p class="text-sm">التقارير</p>
                                </button>
                                <button class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition text-center" onclick="showSettingsModal()">
                                    <i class="fas fa-cog text-2xl mb-2"></i>
                                    <p class="text-sm">الإعدادات</p>
                                </button>
                            </div>
                        </div>

                        <!-- Today's Appointments -->
                        <div class="bg-white rounded-lg p-6 card-shadow mt-6">
                            <div class="flex justify-between items-center mb-4">
                                <h2 class="text-xl font-bold text-gray-800">مواعيد اليوم</h2>
                                <button class="text-blue-600 hover:text-blue-800" onclick="loadTodayAppointments()">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                            <div id="todayAppointmentsList">
                                <div class="text-center py-8">
                                    <div class="loading-spinner mx-auto mb-4"></div>
                                    <p class="text-gray-500">جاري تحميل المواعيد...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="bg-white rounded-lg p-6 card-shadow">
                        <h2 class="text-xl font-bold text-gray-800 mb-4">آخر النشاطات</h2>
                        <div id="recentActivity">
                            <div class="text-center py-4">
                                <div class="loading-spinner mx-auto mb-4"></div>
                                <p class="text-gray-500">جاري التحميل...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modals -->
        <div id="modalContainer"></div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// Default route
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مغسلة السيارات المتنقلة</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
            body { font-family: 'Tajawal', sans-serif; }
            .gradient-bg {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card-shadow {
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
        </style>
    </head>
    <body class="bg-gray-100">
        <div class="min-h-screen">
            <!-- Header -->
            <header class="gradient-bg text-white py-8">
                <div class="container mx-auto px-4 text-center">
                    <h1 class="text-4xl font-bold mb-4">
                        <i class="fas fa-car mr-2"></i>
                        مغسلة السيارات المتنقلة
                    </h1>
                    <p class="text-xl mb-6">خدمة غسيل سيارات احترافية في منزلك أو عملك</p>
                    <div class="flex justify-center space-x-4">
                        <a href="/admin" class="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition">
                            <i class="fas fa-user-tie ml-2"></i>
                            لوحة التحكم
                        </a>
                        <button class="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
                            <i class="fas fa-mobile-alt ml-2"></i>
                            تحميل التطبيق
                        </button>
                    </div>
                </div>
            </header>

            <!-- Features -->
            <section class="py-16">
                <div class="container mx-auto px-4">
                    <h2 class="text-3xl font-bold text-center text-gray-800 mb-12">لماذا تختارنا؟</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="bg-white rounded-lg p-6 card-shadow text-center">
                            <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-clock text-blue-600 text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">حجز سهل وسريع</h3>
                            <p class="text-gray-600">احجز موعدك بكل سهولة من خلال تطبيقنا أو الموقع</p>
                        </div>
                        <div class="bg-white rounded-lg p-6 card-shadow text-center">
                            <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-map-marker-alt text-green-600 text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">خدمة منزلية</h3>
                            <p class="text-gray-600">نصلك أينما كنت في الوقت المحدد</p>
                        </div>
                        <div class="bg-white rounded-lg p-6 card-shadow text-center">
                            <div class="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-star text-yellow-600 text-2xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">جودة عالية</h3>
                            <p class="text-gray-600">خدمة احترافية باستخدام أفضل المنتجات</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <script>
            // Basic functionality for the landing page
            document.addEventListener('DOMContentLoaded', function() {
                console.log('Mobile Car Wash System - Landing Page Loaded');
            });
        </script>
    </body>
    </html>
  `)
})

export default app