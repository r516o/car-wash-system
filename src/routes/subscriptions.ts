import { Hono } from 'hono'

const subscriptionRoutes = new Hono<{ Bindings: any }>()

// Get all subscription packages
subscriptionRoutes.get('/packages', async (c) => {
  const { DB } = c.env
  const { is_active } = c.req.query()
  
  try {
    let query = `
      SELECT * FROM subscription_packages
      WHERE 1=1
    `
    
    const params = []
    
    if (is_active !== undefined) {
      query += ' AND is_active = ?'
      params.push(is_active === 'true')
    }
    
    query += ' ORDER BY monthly_price ASC'
    
    const packages = await DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      data: packages.results,
      count: packages.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch packages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get subscription package by ID
subscriptionRoutes.get('/packages/:id', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const package = await DB.prepare(`
      SELECT * FROM subscription_packages WHERE id = ?
    `).bind(id).first()
    
    if (!package) {
      return c.json({
        success: false,
        error: 'Package not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      data: package
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Create new subscription
subscriptionRoutes.post('/', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { customer_id, package_id, start_date } = body
    
    // Validate required fields
    if (!customer_id || !package_id || !start_date) {
      return c.json({
        success: false,
        error: 'Missing required fields',
        details: ['customer_id', 'package_id', 'start_date']
      }, 400)
    }
    
    // Validate customer
    const customer = await DB.prepare(`
      SELECT id FROM customers WHERE id = ?
    `).bind(customer_id).first()
    
    if (!customer) {
      return c.json({
        success: false,
        error: 'Customer not found'
      }, 404)
    }
    
    // Validate package
    const package = await DB.prepare(`
      SELECT * FROM subscription_packages WHERE id = ? AND is_active = TRUE
    `).bind(package_id).first()
    
    if (!package) {
      return c.json({
        success: false,
        error: 'Package not found or inactive'
      }, 404)
    }
    
    // Check for existing active subscription
    const existingSubscription = await DB.prepare(`
      SELECT id FROM subscriptions 
      WHERE customer_id = ? AND status = 'active'
    `).bind(customer_id).first()
    
    if (existingSubscription) {
      return c.json({
        success: false,
        error: 'Customer already has an active subscription'
      }, 409)
    }
    
    const subscriptionId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    // Calculate end date (1 month from start date)
    const startDate = new Date(start_date)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    
    await DB.prepare(`
      INSERT INTO subscriptions (
        id, customer_id, package_id, total_washes, used_washes, 
        start_date, end_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, 'active', ?, ?)
    `).bind(
      subscriptionId,
      customer_id,
      package_id,
      package.total_washes,
      start_date,
      endDate.toISOString().split('T')[0],
      now,
      now
    ).run()
    
    // Create wash distribution for customer's cars
    const cars = await DB.prepare(`
      SELECT id FROM cars WHERE customer_id = ?
    `).bind(customer_id).all()
    
    if (cars.results.length > 0) {
      // Distribute washes equally among cars
      const washesPerCar = Math.floor(package.total_washes / cars.results.length)
      const remainingWashes = package.total_washes % cars.results.length
      
      for (let i = 0; i < cars.results.length; i++) {
        const carId = cars.results[i].id
        const carWashes = washesPerCar + (i < remainingWashes ? 1 : 0)
        
        if (carWashes > 0) {
          await DB.prepare(`
            INSERT INTO wash_distribution (id, subscription_id, car_id, allocated_washes, used_washes, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?)
          `).bind(
            crypto.randomUUID(),
            subscriptionId,
            carId,
            carWashes,
            now,
            now
          ).run()
        }
      }
    }
    
    // Create scheduling pattern
    await DB.prepare(`
      INSERT INTO subscription_scheduling_patterns (
        id, subscription_id, pattern_type, interval_days, preferred_time_slot, cluster_id, auto_schedule, created_at, updated_at
      ) VALUES (?, ?, 'regular', 3, ?, 'cluster_olaya', TRUE, ?, ?)
    `).bind(
      crypto.randomUUID(),
      subscriptionId,
      'morning', // Default to morning
      now,
      now
    ).run()
    
    // Schedule subscription appointments
    const schedulingResult = await DB.prepare(`
      SELECT * FROM subscription_scheduling_patterns
      WHERE subscription_id = ?
    `).bind(subscriptionId).first()
    
    return c.json({
      success: true,
      data: {
        id: subscriptionId,
        package_name: package.name,
        total_washes: package.total_washes,
        start_date: start_date,
        end_date: endDate.toISOString().split('T')[0],
        car_count: cars.results.length
      },
      message: 'Subscription created successfully'
    }, 201)
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to create subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get customer's subscriptions
subscriptionRoutes.get('/customer/:customer_id', async (c) => {
  const { DB } = c.env
  const { customer_id } = c.req.param()
  const { status } = c.req.query()
  
  try {
    let query = `
      SELECT s.*, sp.name as package_name, sp.name_en, sp.total_washes, sp.monthly_price,
             COUNT(wd.id) as car_count
      FROM subscriptions s
      JOIN subscription_packages sp ON s.package_id = sp.id
      LEFT JOIN wash_distribution wd ON s.id = wd.subscription_id
      WHERE s.customer_id = ?
    `
    
    const params = [customer_id]
    
    if (status) {
      query += ' AND s.status = ?'
      params.push(status)
    }
    
    query += ' GROUP BY s.id ORDER BY s.created_at DESC'
    
    const subscriptions = await DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      data: subscriptions.results,
      count: subscriptions.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch subscriptions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get subscription details with wash distribution
subscriptionRoutes.get('/:id', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const subscription = await DB.prepare(`
      SELECT s.*, sp.name as package_name, sp.name_en, sp.total_washes, sp.monthly_price,
             c.name as customer_name, c.phone as customer_phone
      FROM subscriptions s
      JOIN subscription_packages sp ON s.package_id = sp.id
      JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).bind(id).first()
    
    if (!subscription) {
      return c.json({
        success: false,
        error: 'Subscription not found'
      }, 404)
    }
    
    // Get wash distribution
    const washDistribution = await DB.prepare(`
      SELECT wd.*, cars.model as car_model, cars.type as car_type, cars.plate_number
      FROM wash_distribution wd
      JOIN cars ON wd.car_id = cars.id
      WHERE wd.subscription_id = ?
      ORDER BY cars.created_at
    `).bind(id).all()
    
    // Get scheduled appointments
    const scheduledAppointments = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE customer_id = ? 
        AND is_subscription = TRUE
        AND appointment_date >= ?
        AND status IN ('scheduled', 'confirmed')
    `).bind(subscription.customer_id, subscription.start_date).first()
    
    // Calculate utilization
    const utilizationPercentage = Math.round((subscription.used_washes / subscription.total_washes) * 100)
    const remainingWashes = subscription.total_washes - subscription.used_washes
    
    return c.json({
      success: true,
      data: {
        ...subscription,
        wash_distribution: washDistribution.results,
        scheduled_appointments: scheduledAppointments?.count || 0,
        remaining_washes: remainingWashes,
        utilization_percentage: utilizationPercentage
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch subscription details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Renew subscription
subscriptionRoutes.post('/:id/renew', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    // Get current subscription
    const currentSubscription = await DB.prepare(`
      SELECT s.*, sp.total_washes
      FROM subscriptions s
      JOIN subscription_packages sp ON s.package_id = sp.id
      WHERE s.id = ?
    `).bind(id).first()
    
    if (!currentSubscription) {
      return c.json({
        success: false,
        error: 'Subscription not found'
      }, 404)
    }
    
    if (currentSubscription.status !== 'active') {
      return c.json({
        success: false,
        error: 'Cannot renew inactive subscription'
      }, 400)
    }
    
    const now = new Date().toISOString()
    
    // Deactivate current subscription
    await DB.prepare(`
      UPDATE subscriptions
      SET status = 'expired', updated_at = ?
      WHERE id = ?
    `).bind(now, id).run()
    
    // Create new subscription
    const newSubscriptionId = crypto.randomUUID()
    const newStartDate = new Date(currentSubscription.end_date)
    const newEndDate = new Date(newStartDate)
    newEndDate.setMonth(newEndDate.getMonth() + 1)
    
    await DB.prepare(`
      INSERT INTO subscriptions (
        id, customer_id, package_id, total_washes, used_washes,
        start_date, end_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, 'active', ?, ?)
    `).bind(
      newSubscriptionId,
      currentSubscription.customer_id,
      currentSubscription.package_id,
      currentSubscription.total_washes,
      newStartDate.toISOString().split('T')[0],
      newEndDate.toISOString().split('T')[0],
      now,
      now
    ).run()
    
    // Copy wash distribution from old subscription
    const oldWashDistribution = await DB.prepare(`
      SELECT car_id, allocated_washes
      FROM wash_distribution
      WHERE subscription_id = ?
    `).bind(id).all()
    
    for (const washDist of oldWashDistribution.results) {
      await DB.prepare(`
        INSERT INTO wash_distribution (id, subscription_id, car_id, allocated_washes, used_washes, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `).bind(
        crypto.randomUUID(),
        newSubscriptionId,
        washDist.car_id,
        washDist.allocated_washes,
        now,
        now
      ).run()
    }
    
    return c.json({
      success: true,
      data: {
        new_subscription_id: newSubscriptionId,
        old_subscription_id: id,
        start_date: newStartDate.toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0]
      },
      message: 'Subscription renewed successfully'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to renew subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Cancel subscription
subscriptionRoutes.post('/:id/cancel', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const result = await DB.prepare(`
      UPDATE subscriptions
      SET status = 'cancelled', updated_at = ?
      WHERE id = ? AND status = 'active'
    `).bind(new Date().toISOString(), id).run()
    
    if (result.changes === 0) {
      return c.json({
        success: false,
        error: 'Active subscription not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Subscription cancelled successfully'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export { subscriptionRoutes }