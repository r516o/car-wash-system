import { Hono } from 'hono'
import { z } from 'zod'

const customerRoutes = new Hono<{ Bindings: any }>()

// Customer validation schema
const customerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  email: z.string().email().optional(),
  address: z.string().optional(),
  preferred_time: z.enum(['morning', 'evening']).optional(),
  language: z.enum(['ar', 'en']).default('ar')
})

const carSchema = z.object({
  customer_id: z.string().uuid(),
  type: z.string().min(2).max(50),
  model: z.string().min(2).max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  plate_number: z.string().optional(),
  notes: z.string().optional()
})

// Get all customers
customerRoutes.get('/', async (c) => {
  const { DB } = c.env
  
  try {
    const { results } = await DB.prepare(`
      SELECT c.*, COUNT(cars.id) as car_count
      FROM customers c
      LEFT JOIN cars ON c.id = cars.customer_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all()
    
    return c.json({
      success: true,
      data: results,
      count: results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch customers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get customer by ID
customerRoutes.get('/:id', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const customer = await DB.prepare(`
      SELECT c.*, COUNT(cars.id) as car_count
      FROM customers c
      LEFT JOIN cars ON c.id = cars.customer_id
      WHERE c.id = ?
      GROUP BY c.id
    `).bind(id).first()
    
    if (!customer) {
      return c.json({
        success: false,
        error: 'Customer not found'
      }, 404)
    }
    
    // Get customer's cars
    const cars = await DB.prepare(`
      SELECT * FROM cars WHERE customer_id = ? ORDER BY created_at DESC
    `).bind(id).all()
    
    // Get customer's subscription
    const subscription = await DB.prepare(`
      SELECT s.*, sp.name as package_name, sp.total_washes
      FROM subscriptions s
      JOIN subscription_packages sp ON s.package_id = sp.id
      WHERE s.customer_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC LIMIT 1
    `).bind(id).first()
    
    // Get recent appointments
    const appointments = await DB.prepare(`
      SELECT a.*, s.name as service_name, cars.model as car_model
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN cars ON a.car_id = cars.id
      WHERE a.customer_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 5
    `).bind(id).all()
    
    return c.json({
      success: true,
      data: {
        ...customer,
        cars: cars.results,
        subscription,
        recent_appointments: appointments.results
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch customer details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Create new customer
customerRoutes.post('/', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const validatedData = customerSchema.parse(body)
    
    const customerId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    await DB.prepare(`
      INSERT INTO customers (id, name, phone, email, address, preferred_time, language, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customerId,
      validatedData.name,
      validatedData.phone,
      validatedData.email || null,
      validatedData.address || null,
      validatedData.preferred_time || null,
      validatedData.language,
      now,
      now
    ).run()
    
    // Create loyalty points account
    await DB.prepare(`
      INSERT INTO loyalty_points (id, customer_id, points_balance, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?)
    `).bind(crypto.randomUUID(), customerId, now, now).run()
    
    // Log the creation
    await DB.prepare(`
      INSERT INTO audit_log (id, table_name, record_id, action, user_id, user_type, created_at)
      VALUES (?, 'customers', ?, 'INSERT', ?, 'employee', ?)
    `).bind(crypto.randomUUID(), customerId, 'system', now).run()
    
    return c.json({
      success: true,
      data: { id: customerId, ...validatedData },
      message: 'Customer created successfully'
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, 400)
    }
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return c.json({
        success: false,
        error: 'Phone number already exists'
      }, 409)
    }
    
    return c.json({
      success: false,
      error: 'Failed to create customer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Update customer
customerRoutes.put('/:id', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const body = await c.req.json()
    const validatedData = customerSchema.partial().parse(body)
    
    const now = new Date().toISOString()
    
    // Build dynamic update query
    const updates = []
    const values = []
    
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`)
        values.push(value)
      }
    })
    
    if (updates.length === 0) {
      return c.json({
        success: false,
        error: 'No valid fields to update'
      }, 400)
    }
    
    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)
    
    const result = await DB.prepare(`
      UPDATE customers SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run()
    
    if (result.changes === 0) {
      return c.json({
        success: false,
        error: 'Customer not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Customer updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, 400)
    }
    
    return c.json({
      success: false,
      error: 'Failed to update customer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get customer's cars
customerRoutes.get('/:id/cars', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const cars = await DB.prepare(`
      SELECT * FROM cars WHERE customer_id = ? ORDER BY created_at DESC
    `).bind(id).all()
    
    return c.json({
      success: true,
      data: cars.results,
      count: cars.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch cars',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Add car to customer
customerRoutes.post('/:id/cars', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const body = await c.req.json()
    const validatedData = carSchema.parse({ ...body, customer_id: id })
    
    const carId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    await DB.prepare(`
      INSERT INTO cars (id, customer_id, type, model, year, color, plate_number, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      carId,
      validatedData.customer_id,
      validatedData.type,
      validatedData.model,
      validatedData.year || null,
      validatedData.color || null,
      validatedData.plate_number || null,
      validatedData.notes || null,
      now
    ).run()
    
    return c.json({
      success: true,
      data: { id: carId, ...validatedData },
      message: 'Car added successfully'
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, 400)
    }
    
    return c.json({
      success: false,
      error: 'Failed to add car',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get customer's subscription
customerRoutes.get('/:id/subscription', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const subscription = await DB.prepare(`
      SELECT s.*, sp.name as package_name, sp.name_en, sp.total_washes, sp.monthly_price
      FROM subscriptions s
      JOIN subscription_packages sp ON s.package_id = sp.id
      WHERE s.customer_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `).bind(id).first()
    
    if (!subscription) {
      return c.json({
        success: false,
        error: 'No active subscription found'
      }, 404)
    }
    
    // Get wash distribution
    const washDistribution = await DB.prepare(`
      SELECT wd.*, cars.model as car_model, cars.type as car_type
      FROM wash_distribution wd
      JOIN cars ON wd.car_id = cars.id
      WHERE wd.subscription_id = ?
      ORDER BY cars.created_at
    `).bind(subscription.id).all()
    
    return c.json({
      success: true,
      data: {
        ...subscription,
        wash_distribution: washDistribution.results
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get customer's loyalty points
customerRoutes.get('/:id/loyalty-points', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const loyaltyPoints = await DB.prepare(`
      SELECT * FROM loyalty_points WHERE customer_id = ?
    `).bind(id).first()
    
    if (!loyaltyPoints) {
      return c.json({
        success: false,
        error: 'Loyalty points account not found'
      }, 404)
    }
    
    // Get recent transactions
    const transactions = await DB.prepare(`
      SELECT * FROM points_transactions 
      WHERE customer_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `).bind(id).all()
    
    return c.json({
      success: true,
      data: {
        ...loyaltyPoints,
        recent_transactions: transactions.results
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch loyalty points',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export { customerRoutes }