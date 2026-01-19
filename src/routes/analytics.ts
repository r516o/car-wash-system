import { Hono } from 'hono'

const analyticsRoutes = new Hono<{ Bindings: any }>()

// Get dashboard statistics
analyticsRoutes.get('/dashboard', async (c) => {
  const { DB } = c.env
  const { period = 'month' } = c.req.query()
  
  try {
    let dateFilter = ''
    
    switch (period) {
      case 'day':
        dateFilter = "DATE(created_at) = DATE('now')"
        break
      case 'week':
        dateFilter = "DATE(created_at) >= DATE('now', '-7 days')"
        break
      case 'month':
        dateFilter = "DATE(created_at) >= DATE('now', '-30 days')"
        break
      case 'year':
        dateFilter = "DATE(created_at) >= DATE('now', '-365 days')"
        break
      default:
        dateFilter = "DATE(created_at) >= DATE('now', '-30 days')"
    }
    
    // Get customer statistics
    const customerStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN ${dateFilter} THEN 1 END) as new_customers,
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM subscriptions WHERE customer_id = customers.id AND status = 'active'
        ) THEN 1 END) as active_subscribers
      FROM customers
    `).first()
    
    // Get appointment statistics
    const appointmentStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COUNT(CASE WHEN ${dateFilter} THEN 1 END) as period_appointments
      FROM appointments
    `).first()
    
    // Get revenue statistics
    const revenueStats = await DB.prepare(`
      SELECT 
        SUM(amount) as total_revenue,
        SUM(CASE WHEN ${dateFilter.replace('created_at', 'payments.created_at')} THEN amount END) as period_revenue,
        COUNT(*) as total_transactions
      FROM payments
      WHERE status = 'completed'
    `).first()
    
    // Get subscription statistics
    const subscriptionStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_subscriptions,
        COUNT(CASE WHEN ${dateFilter.replace('created_at', 'subscriptions.created_at')} THEN 1 END) as new_subscriptions
      FROM subscriptions
    `).first()
    
    // Get rating statistics
    const ratingStats = await DB.prepare(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN ${dateFilter.replace('created_at', 'ratings.created_at')} THEN 1 END) as period_ratings
      FROM ratings
    `).first()
    
    // Get today's appointments
    const todayAppointments = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE appointment_date = DATE('now')
    `).first()
    
    // Get upcoming appointments for next 7 days
    const upcomingAppointments = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE appointment_date > DATE('now') 
        AND appointment_date <= DATE('now', '+7 days')
        AND status IN ('scheduled', 'confirmed')
    `).first()
    
    const dashboard = {
      customers: {
        total: customerStats?.total_customers || 0,
        new: customerStats?.new_customers || 0,
        active_subscribers: customerStats?.active_subscribers || 0,
        conversion_rate: customerStats?.total_customers > 0 ? 
          Math.round((customerStats?.active_subscribers / customerStats?.total_customers) * 100) : 0
      },
      appointments: {
        total: appointmentStats?.total_appointments || 0,
        completed: appointmentStats?.completed_appointments || 0,
        cancelled: appointmentStats?.cancelled_appointments || 0,
        today: todayAppointments?.count || 0,
        upcoming: upcomingAppointments?.count || 0,
        completion_rate: appointmentStats?.total_appointments > 0 ?
          Math.round((appointmentStats?.completed_appointments / appointmentStats?.total_appointments) * 100) : 0
      },
      revenue: {
        total: revenueStats?.total_revenue || 0,
        period: revenueStats?.period_revenue || 0,
        transactions: revenueStats?.total_transactions || 0,
        average_transaction: revenueStats?.total_transactions > 0 ?
          Math.round(revenueStats?.total_revenue / revenueStats?.total_transactions) : 0
      },
      subscriptions: {
        total: subscriptionStats?.total_subscriptions || 0,
        active: subscriptionStats?.active_subscriptions || 0,
        expired: subscriptionStats?.expired_subscriptions || 0,
        new: subscriptionStats?.new_subscriptions || 0
      },
      ratings: {
        average: ratingStats?.average_rating ? Math.round(ratingStats.average_rating * 10) / 10 : 0,
        total: ratingStats?.total_ratings || 0,
        period: ratingStats?.period_ratings || 0
      }
    }
    
    return c.json({
      success: true,
      data: dashboard
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get revenue analytics
analyticsRoutes.get('/revenue', async (c) => {
  const { DB } = c.env
  const { start_date, end_date, group_by = 'day' } = c.req.query()
  
  try {
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = end_date || new Date().toISOString().split('T')[0]
    
    let groupByClause = ''
    switch (group_by) {
      case 'day':
        groupByClause = 'DATE(payments.created_at)'
        break
      case 'week':
        groupByClause = "strftime('%Y-W%W', payments.created_at)"
        break
      case 'month':
        groupByClause = "strftime('%Y-%m', payments.created_at)"
        break
      default:
        groupByClause = 'DATE(payments.created_at)'
    }
    
    const revenue = await DB.prepare(`
      SELECT 
        ${groupByClause} as period,
        SUM(amount) as total_revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as average_amount,
        SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_revenue,
        SUM(CASE WHEN payment_method IN ('credit_card', 'apple_pay', 'google_pay') THEN amount ELSE 0 END) as digital_revenue
      FROM payments
      WHERE created_at >= ? AND created_at <= ? AND status = 'completed'
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause} DESC
      LIMIT 100
    `).bind(startDate, endDate).all()
    
    return c.json({
      success: true,
      data: revenue.results
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch revenue analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get appointment analytics
analyticsRoutes.get('/appointments', async (c) => {
  const { DB } = c.env
  const { start_date, end_date, group_by = 'day' } = c.req.query()
  
  try {
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = end_date || new Date().toISOString().split('T')[0]
    
    let groupByClause = ''
    switch (group_by) {
      case 'day':
        groupByClause = 'DATE(appointment_date)'
        break
      case 'week':
        groupByClause = "strftime('%Y-W%W', appointment_date)"
        break
      case 'month':
        groupByClause = "strftime('%Y-%m', appointment_date)"
        break
      default:
        groupByClause = 'DATE(appointment_date)'
    }
    
    const appointments = await DB.prepare(`
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show_appointments,
        COUNT(CASE WHEN is_subscription = TRUE THEN 1 END) as subscription_appointments,
        COUNT(CASE WHEN is_subscription = FALSE THEN 1 END) as individual_appointments
      FROM appointments
      WHERE appointment_date >= ? AND appointment_date <= ?
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause} DESC
      LIMIT 100
    `).bind(startDate, endDate).all()
    
    return c.json({
      success: true,
      data: appointments.results
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch appointment analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get customer analytics
analyticsRoutes.get('/customers', async (c) => {
  const { DB } = c.env
  const { start_date, end_date, group_by = 'week' } = c.req.query()
  
  try {
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = end_date || new Date().toISOString().split('T')[0]
    
    let groupByClause = ''
    switch (group_by) {
      case 'day':
        groupByClause = 'DATE(created_at)'
        break
      case 'week':
        groupByClause = "strftime('%Y-W%W', created_at)"
        break
      case 'month':
        groupByClause = "strftime('%Y-%m', created_at)"
        break
      default:
        groupByClause = "strftime('%Y-W%W', created_at)"
    }
    
    const customers = await DB.prepare(`
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as new_customers,
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM subscriptions WHERE customer_id = customers.id AND status = 'active'
        ) THEN 1 END) as new_subscribers
      FROM customers
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause} DESC
      LIMIT 100
    `).bind(startDate, endDate).all()
    
    return c.json({
      success: true,
      data: customers.results
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch customer analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get service analytics
analyticsRoutes.get('/services', async (c) => {
  const { DB } = c.env
  const { start_date, end_date } = c.req.query()
  
  try {
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = end_date || new Date().toISOString().split('T')[0]
    
    const services = await DB.prepare(`
      SELECT 
        s.id, s.name, s.name_en, s.price,
        COUNT(a.id) as usage_count,
        AVG(r.rating) as average_rating,
        SUM(p.amount) as total_revenue
      FROM services s
      LEFT JOIN appointments a ON (s.id = a.service_id AND a.appointment_date >= ? AND a.appointment_date <= ?)
      LEFT JOIN ratings r ON a.id = r.appointment_id
      LEFT JOIN payments p ON a.id = p.appointment_id
      WHERE s.is_active = TRUE
      GROUP BY s.id
      ORDER BY usage_count DESC
    `).bind(startDate, endDate).all()
    
    return c.json({
      success: true,
      data: services.results
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch service analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get geographic analytics
analyticsRoutes.get('/geographic', async (c) => {
  const { DB } = c.env
  const { start_date, end_date } = c.req.query()
  
  try {
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = end_date || new Date().toISOString().split('T')[0]
    
    const geographic = await DB.prepare(`
      SELECT 
        gc.name, gc.name_en, gc.center_latitude, gc.center_longitude,
        COUNT(a.id) as appointment_count,
        AVG(r.rating) as average_rating,
        SUM(p.amount) as total_revenue
      FROM geographic_clusters gc
      LEFT JOIN appointments a ON (
        gc.id = a.cluster_id AND 
        a.appointment_date >= ? AND 
        a.appointment_date <= ?
      )
      LEFT JOIN ratings r ON a.id = r.appointment_id
      LEFT JOIN payments p ON a.id = p.appointment_id
      WHERE gc.is_active = TRUE
      GROUP BY gc.id
      ORDER BY appointment_count DESC
    `).bind(startDate, endDate).all()
    
    return c.json({
      success: true,
      data: geographic.results
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch geographic analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get business metrics for a specific period
analyticsRoutes.get('/business-metrics', async (c) => {
  const { DB } = c.env
  const { start_date, end_date, metric_type = 'daily' } = c.req.query()
  
  try {
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = end_date || new Date().toISOString().split('T')[0]
    
    const metrics = await DB.prepare(`
      SELECT * FROM business_metrics
      WHERE metric_date >= ? AND metric_date <= ? AND metric_type = ?
      ORDER BY metric_date DESC
    `).bind(startDate, endDate, metric_type).all()
    
    return c.json({
      success: true,
      data: metrics.results
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch business metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Generate business metrics (should be called by cron job)
analyticsRoutes.post('/generate-metrics', async (c) => {
  const { DB } = c.env
  const { date, metric_type = 'daily' } = c.req.json()
  
  try {
    const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Calculate appointments metrics
    const appointmentMetrics = await DB.prepare(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments
      FROM appointments
      WHERE DATE(appointment_date) = ?
    `).bind(targetDate).first()
    
    // Calculate revenue metrics
    const revenueMetrics = await DB.prepare(`
      SELECT 
        SUM(amount) as total_revenue,
        COUNT(*) as transaction_count
      FROM payments
      WHERE DATE(created_at) = ? AND status = 'completed'
    `).bind(targetDate).first()
    
    // Calculate customer metrics
    const customerMetrics = await DB.prepare(`
      SELECT 
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(DISTINCT CASE WHEN created_at >= DATE(?) THEN customer_id END) as new_customers
      FROM appointments
      WHERE DATE(appointment_date) = ?
    `).bind(targetDate, targetDate).first()
    
    // Calculate rating metrics
    const ratingMetrics = await DB.prepare(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as rating_count
      FROM ratings
      WHERE DATE(created_at) = ?
    `).bind(targetDate).first()
    
    // Insert or update business metrics
    await DB.prepare(`
      INSERT OR REPLACE INTO business_metrics (
        id, metric_date, metric_type, total_appointments, completed_appointments,
        cancelled_appointments, total_revenue, new_customers, returning_customers,
        average_rating, total_ratings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      targetDate,
      metric_type,
      appointmentMetrics?.total_appointments || 0,
      appointmentMetrics?.completed_appointments || 0,
      appointmentMetrics?.cancelled_appointments || 0,
      revenueMetrics?.total_revenue || 0,
      customerMetrics?.new_customers || 0,
      (customerMetrics?.unique_customers || 0) - (customerMetrics?.new_customers || 0),
      ratingMetrics?.average_rating || 0,
      ratingMetrics?.rating_count || 0,
      new Date().toISOString(),
      new Date().toISOString()
    ).run()
    
    return c.json({
      success: true,
      data: {
        date: targetDate,
        metric_type,
        appointment_metrics: appointmentMetrics,
        revenue_metrics: revenueMetrics,
        customer_metrics: customerMetrics,
        rating_metrics: ratingMetrics
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to generate business metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export { analyticsRoutes }