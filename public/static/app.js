// Frontend JavaScript for the admin dashboard
class CarWashAdmin {
  constructor() {
    this.apiBaseUrl = '/api'
    this.init()
  }

  init() {
    this.loadDashboardData()
    this.loadTodayAppointments()
    this.loadRecentActivity()
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Refresh buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('[onclick*="load"]')) {
        const functionName = e.target.closest('[onclick*="load"]').getAttribute('onclick')
        if (functionName && typeof this[functionName.replace('()', '')] === 'function') {
          this[functionName.replace('()', '')]()
        }
      }
    })
  }

  async loadDashboardData() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/analytics/dashboard?period=month`)
      const result = await response.json()
      
      if (result.success) {
        this.updateDashboardCards(result.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  updateDashboardCards(data) {
    // Update customer stats
    const activeCustomers = document.getElementById('activeCustomers')
    if (activeCustomers) {
      activeCustomers.textContent = data.customers.active_subscribers || 0
    }

    // Update today's appointments
    const todayAppointments = document.getElementById('todayAppointments')
    if (todayAppointments) {
      todayAppointments.textContent = data.appointments.today || 0
    }

    // Update monthly revenue
    const monthlyRevenue = document.getElementById('monthlyRevenue')
    if (monthlyRevenue) {
      monthlyRevenue.textContent = `${data.revenue.period || 0} ر.س`
    }

    // Update average rating
    const averageRating = document.getElementById('averageRating')
    if (averageRating) {
      averageRating.textContent = data.ratings.average || '0.0'
    }
  }

  async loadTodayAppointments() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/appointments/today/summary`)
      const result = await response.json()
      
      if (result.success) {
        this.displayTodayAppointments(result.data)
      }
    } catch (error) {
      console.error('Failed to load today appointments:', error)
    }
  }

  displayTodayAppointments(data) {
    const container = document.getElementById('todayAppointmentsList')
    if (!container) return

    if (!data.appointments || Object.keys(data.appointments).length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-calendar-times text-4xl mb-4"></i>
          <p>لا توجد مواعيد لهذا اليوم</p>
        </div>
      `
      return
    }

    let html = ''
    const sortedTimes = Object.keys(data.appointments).sort()

    sortedTimes.forEach(time => {
      const appointments = data.appointments[time]
      html += `
        <div class="mb-4">
          <h4 class="font-bold text-gray-800 mb-2">${time}</h4>
          <div class="space-y-2">
            ${appointments.map(apt => `
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium">${apt.customer_name}</p>
                  <p class="text-sm text-gray-600">${apt.car_model} - ${apt.service_name}</p>
                  <p class="text-xs text-gray-500">${apt.location}</p>
                </div>
                <div class="text-right">
                  <span class="status-badge status-${apt.status}">${this.getStatusText(apt.status)}</span>
                  ${apt.is_subscription ? '<i class="fas fa-star text-yellow-500 ml-2" title="اشتراك"></i>' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    })

    container.innerHTML = html
  }

  async loadRecentActivity() {
    try {
      // Load recent notifications as activity
      const response = await fetch(`${this.apiBaseUrl}/notifications/customer/all?limit=5`)
      const result = await response.json()
      
      this.displayRecentActivity(result.data || [])
    } catch (error) {
      console.error('Failed to load recent activity:', error)
    }
  }

  displayRecentActivity(activities) {
    const container = document.getElementById('recentActivity')
    if (!container) return

    if (!activities || activities.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-gray-500">
          <i class="fas fa-bell-slash text-2xl mb-2"></i>
          <p>لا توجد نشاطات حديثة</p>
        </div>
      `
      return
    }

    const html = activities.map(activity => `
      <div class="flex items-start space-x-3 mb-4">
        <div class="bg-blue-100 p-2 rounded-full">
          <i class="fas fa-bell text-blue-600"></i>
        </div>
        <div class="flex-1">
          <p class="font-medium text-sm">${activity.title}</p>
          <p class="text-xs text-gray-600">${activity.message}</p>
          <p class="text-xs text-gray-400">${this.formatTime(activity.created_at)}</p>
        </div>
      </div>
    `).join('')

    container.innerHTML = html
  }

  getStatusText(status) {
    const statusMap = {
      'scheduled': 'مجدول',
      'confirmed': 'مؤكد',
      'in_progress': 'قيد التنفيذ',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'no_show': 'لم يحضر'
    }
    return statusMap[status] || status
  }

  formatTime(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days} يوم`
    if (hours > 0) return `${hours} ساعة`
    if (minutes > 0) return `${minutes} دقيقة`
    return 'الآن'
  }

  // Modal functions
  showAddCustomerModal() {
    this.showModal(`
      <div class="max-w-md mx-auto">
        <h3 class="text-xl font-bold mb-4">إضافة عميل جديد</h3>
        <form id="addCustomerForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
            <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
            <input type="tel" name="phone" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input type="text" name="address" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">الوقت المفضل</label>
            <select name="preferred_time" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="morning">الصباح</option>
              <option value="evening">المساء</option>
            </select>
          </div>
          <div class="flex space-x-3">
            <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition">
              إضافة عميل
            </button>
            <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    `)

    // Handle form submission
    document.getElementById('addCustomerForm').addEventListener('submit', async (e) => {
      e.preventDefault()
      const formData = new FormData(e.target)
      const data = Object.fromEntries(formData)

      try {
        const response = await fetch(`${this.apiBaseUrl}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        const result = await response.json()
        
        if (result.success) {
          this.showNotification('تم إضافة العميل بنجاح', 'success')
          this.loadDashboardData()
          this.closeModal()
        } else {
          this.showNotification(result.error || 'فشل إضافة العميل', 'error')
        }
      } catch (error) {
        this.showNotification('خطأ في الاتصال بالخادم', 'error')
      }
    })
  }

  showScheduleModal() {
    this.showModal(`
      <div class="max-w-lg mx-auto">
        <h3 class="text-xl font-bold mb-4">جدولة موعد جديد</h3>
        <form id="scheduleForm" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
              <input type="date" name="appointment_date" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
              <input type="time" name="appointment_time" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">العميل</label>
            <select name="customer_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">اختر العميل</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">السيارة</label>
            <select name="car_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">اختر السيارة</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">نوع الخدمة</label>
            <select name="service_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">اختر الخدمة</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
            <input type="text" name="location" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="flex space-x-3">
            <button type="submit" class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition">
              حجز الموعد
            </button>
            <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    `)

    // Load customers, cars, and services
    this.loadFormData()
  }

  async loadFormData() {
    try {
      // Load customers
      const customersResponse = await fetch(`${this.apiBaseUrl}/customers`)
      const customersResult = await customersResponse.json()
      
      if (customersResult.success) {
        const customerSelect = document.querySelector('select[name="customer_id"]')
        customerSelect.innerHTML = '<option value="">اختر العميل</option>' +
          customersResult.data.map(c => `<option value="${c.id}">${c.name} - ${c.phone}</option>`).join('')
      }

      // Load services
      const servicesResponse = await fetch(`${this.apiBaseUrl}/services`)
      const servicesResult = await servicesResponse.json()
      
      if (servicesResult.success) {
        const serviceSelect = document.querySelector('select[name="service_id"]')
        serviceSelect.innerHTML = '<option value="">اختر الخدمة</option>' +
          servicesResult.data.map(s => `<option value="${s.id}">${s.name} - ${s.price} ر.س</option>`).join('')
      }
    } catch (error) {
      console.error('Failed to load form data:', error)
    }
  }

  showReportsModal() {
    this.showModal(`
      <div class="max-w-2xl mx-auto">
        <h3 class="text-xl font-bold mb-4">التقارير والإحصائيات</h3>
        <div class="grid grid-cols-2 gap-4 mb-6">
          <button class="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition" onclick="generateReport('revenue')">
            <i class="fas fa-chart-line text-2xl mb-2"></i>
            <p>تقرير الإيرادات</p>
          </button>
          <button class="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition" onclick="generateReport('appointments')">
            <i class="fas fa-calendar-check text-2xl mb-2"></i>
            <p>تقرير المواعيد</p>
          </button>
          <button class="bg-yellow-600 text-white p-4 rounded-lg hover:bg-yellow-700 transition" onclick="generateReport('customers')">
            <i class="fas fa-users text-2xl mb-2"></i>
            <p>تقرير العملاء</p>
          </button>
          <button class="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition" onclick="generateReport('services')">
            <i class="fas fa-cogs text-2xl mb-2"></i>
            <p>تقرير الخدمات</p>
          </button>
        </div>
        <div class="text-center">
          <button onclick="closeModal()" class="bg-gray-300 text-gray-700 py-2 px-6 rounded-md hover:bg-gray-400 transition">
            إغلاق
          </button>
        </div>
      </div>
    `)
  }

  showSettingsModal() {
    this.showModal(`
      <div class="max-w-2xl mx-auto">
        <h3 class="text-xl font-bold mb-4">الإعدادات</h3>
        <div class="space-y-6">
          <div>
            <h4 class="font-medium text-gray-800 mb-2">ساعات العمل</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">من</label>
                <input type="time" value="06:00" class="w-full px-3 py-2 border border-gray-300 rounded-md">
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">إلى</label>
                <input type="time" value="19:00" class="w-full px-3 py-2 border border-gray-300 rounded-md">
              </div>
            </div>
          </div>
          <div>
            <h4 class="font-medium text-gray-800 mb-2">الحد الأقصى للمواعيد المتزامنة</h4>
            <input type="number" value="4" min="1" max="10" class="w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <div>
            <h4 class="font-medium text-gray-800 mb-2">وقت التنقل بين المواقع</h4>
            <input type="number" value="15" min="5" max="60" class="w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
        </div>
        <div class="flex space-x-3 mt-6">
          <button class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition">
            حفظ الإعدادات
          </button>
          <button onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition">
            إلغاء
          </button>
        </div>
      </div>
    `)
  }

  showModal(content) {
    const modalContainer = document.getElementById('modalContainer')
    modalContainer.innerHTML = `
      <div class="modal-overlay" onclick="closeModal()">
        <div class="modal-content" onclick="event.stopPropagation()">
          ${content}
        </div>
      </div>
    `
  }

  closeModal() {
    const modalContainer = document.getElementById('modalContainer')
    modalContainer.innerHTML = ''
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 
      type === 'error' ? 'bg-red-500' : 
      type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`
    notification.innerHTML = `
      <div class="flex items-center">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="mr-2">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 5000)
  }
}

// Global functions for onclick handlers
window.showAddCustomerModal = () => carWashAdmin.showAddCustomerModal()
window.showScheduleModal = () => carWashAdmin.showScheduleModal()
window.showReportsModal = () => carWashAdmin.showReportsModal()
window.showSettingsModal = () => carWashAdmin.showSettingsModal()
window.closeModal = () => carWashAdmin.closeModal()
window.loadTodayAppointments = () => carWashAdmin.loadTodayAppointments()

// Initialize the admin system
const carWashAdmin = new CarWashAdmin()

console.log('Car Wash Admin System initialized')