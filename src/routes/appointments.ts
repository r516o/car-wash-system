import { Hono } from 'hono'

const appointmentRoutes = new Hono<{ Bindings: any }>()

// Get all appointments
appointmentRoutes.get('/', async (c) => {
  const { DB } = c.env
  const { date, status, customer_id, employee_id, limit = 50, offset = 0 } = c.req.query()
  
  try {
    let query = `
      SELECT a.*, c.name as customer_name, c.phone as customer_phone,
             cars.model as car_model, cars.type as car_type, cars.plate_number,
             s.name as service_name, s.price as service_price,
             e.name as employee_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN cars ON a.car_id = cars.id
      JOIN services s ON a.service_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `
    
    const conditions = []
    const params = []
    
    if (date) {
      conditions.push('a.appointment_date = ?')
      params.push(date)
    }
    
    if (status) {
      conditions.push('a.status = ?')
      params.push(status)
    }
    
    if (customer_id) {
      conditions.push('a.customer_id = ?')
      params.push(customer_id)
    }
    
    if (employee_id) {
      conditions.push('a.employee_id = ?')
      params.push(employee_id)
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC'
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const appointments = await DB.prepare(query).bind(...params).all()
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE 1=1
    `
    
    if (conditions.length > 0) {
      countQuery += ' AND ' + conditions.join(' AND ')
    }
    
    const countResult = await DB.prepare(countQuery).bind(...params.slice(0, -2)).first()
    
    return c.json({
      success: true,
      data: appointments.results,
      pagination: {
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch appointments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get appointment by ID
appointmentRoutes.get('/:id', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const appointment = await DB.prepare(`
      SELECT a.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
             cars.model as car_model, cars.type as car_type, cars.color, cars.plate_number,
             s.name as service_name, s.description as service_description, s.price as service_price,
             e.name as employee_name, e.phone as employee_phone
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN cars ON a.car_id = cars.id
      JOIN services s ON a.service_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.id = ?
    `).bind(id).first()
    
    if (!appointment) {
      return c.json({
        success: false,
        error: 'Appointment not found'
      }, 404)
    }
    
    // Get appointment history/status changes
    const statusHistory = await DB.prepare(`
      SELECT * FROM appointment_status_history
      WHERE appointment_id = ?
      ORDER BY created_at DESC
    `).bind(id).all()
    
    // Get ratings if completed
    let rating = null
    if (appointment.status === 'completed') {
      rating = await DB.prepare(`
        SELECT * FROM ratings
        WHERE appointment_id = ?
      `).bind(id).first()
    }
    
    return c.json({
      success: true,
      data: {
        ...appointment,
        status_history: statusHistory.results,
        rating
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch appointment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Create new appointment
appointmentRoutes.post('/', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    
    // Validate required fields
    const requiredFields = ['customer_id', 'car_id', 'service_id', 'appointment_date', 'appointment_time', 'location']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return c.json({
        success: false,
        error: 'Missing required fields',
        details: missingFields
      }, 400)
    }
    
    // Check for conflicts
    const conflicts = await DB.prepare(`
      SELECT COUNT(*) as conflict_count
      FROM appointments
      WHERE appointment_date = ? 
        AND appointment_time = ?
        AND status IN ('scheduled', 'confirmed', 'in_progress')
        AND (
          employee_id = ? OR location = ?
        )
    `).bind(
      body.appointment_date,
      body.appointment_time,
      body.employee_id,
      body.location
    ).first()
    
    if (conflicts?.conflict_count > 0) {
      return c.json({
        success: false,
        error: 'Appointment conflict detected',
        details: 'The selected time, employee, or location is already booked'
      }, 409)
    }
    
    // Validate customer and car
    const customerCar = await DB.prepare(`
      SELECT c.id as customer_id, cars.id as car_id
      FROM customers c
      JOIN cars ON c.id = cars.customer_id
      WHERE c.id = ? AND cars.id = ?
    `).bind(body.customer_id, body.car_id).first()
    
    if (!customerCar) {
      return c.json({
        success: false,
        error: 'Invalid customer or car'
      }, 400)
    }
    
    // Validate service
    const service = await DB.prepare(`
      SELECT id, duration_minutes FROM services WHERE id = ? AND is_active = TRUE
    `).bind(body.service_id).first()
    
    if (!service) {
      return c.json({
        success: false,
        error: 'Invalid or inactive service'
      }, 400)
    }
    
    const appointmentId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    // Create appointment
    await DB.prepare(`
      INSERT INTO appointments (
        id, customer_id, car_id, service_id, employee_id, appointment_date, appointment_time,
        duration_minutes, location, latitude, longitude, is_subscription, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `).bind(
      appointmentId,
      body.customer_id,
      body.car_id,
      body.service_id,
      body.employee_id || null,
      body.appointment_date,
      body.appointment_time,
      service.duration_minutes || 20,
      body.location,
      body.latitude || null,
      body.longitude || null,
      body.is_subscription || false,
      body.notes || null,
      now,
      now
    ).run()
    
    // Update location availability if cluster-based
    if (body.cluster_id) {
      await DB.prepare(`
        UPDATE location_availability
        SET booked_appointments = booked_appointments + 1
        WHERE date = ? AND time_slot_id = ? AND cluster_id = ?
      `).bind(body.appointment_date, body.time_slot_id, body.cluster_id).run()
    }
    
    // Schedule reminder notification
    const appointmentDateTime = new Date(`${body.appointment_date}T${body.appointment_time}`)
    const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000) // 24 hours before
    
    await DB.prepare(`
      INSERT INTO notification_queue (
        id, recipient_type, recipient_id, template_id, title, message, 
        scheduled_for, channels, created_at
      ) VALUES (?, 'customer', ?, 'tmpl_appointment_reminder', ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      body.customer_id,
      'تذكير بموعد الغسيل',
      `موعدك المقرر غداً الساعة ${body.appointment_time} في ${body.location}`,
      reminderTime.toISOString(),
      JSON.stringify(['push', 'sms']),
      now
    ).run()
    
    // Log the creation
    await DB.prepare(`
      INSERT INTO audit_log (id, table_name, record_id, action, user_id, user_type, created_at)
      VALUES (?, 'appointments', ?, 'INSERT', ?, 'customer', ?)
    `).bind(crypto.randomUUID(), appointmentId, body.customer_id, now).run()
    
    return c.json({
      success: true,
      data: { id: appointmentId },
      message: 'Appointment created successfully'
    }, 201)
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to create appointment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Update appointment status
appointmentRoutes.patch('/:id/status', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const body = await c.req.json()
    const { status, notes } = body
    
    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
    if (!validStatuses.includes(status)) {
      return c.json({
        success: false,
        error: 'Invalid status',
        details: `Valid statuses are: ${validStatuses.join(', ')}`
      }, 400)
    }
    
    const now = new Date().toISOString()
    
    // Get current appointment details
    const currentAppointment = await DB.prepare(`
      SELECT * FROM appointments WHERE id = ?
    `).bind(id).first()
    
    if (!currentAppointment) {
      return c.json({
        success: false,
        error: 'Appointment not found'
      }, 404)
    }
    
    // Update appointment
    await DB.prepare(`
      UPDATE appointments 
      SET status = ?, notes = COALESCE(?, notes), updated_at = ?
      WHERE id = ?
    `).bind(status, notes || null, now, id).run()
    
    // Log status change
    await DB.prepare(`
      INSERT INTO appointment_status_history (id, appointment_id, old_status, new_status, changed_by, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      id,
      currentAppointment.status,
      status,
      'system', // Should be actual user ID
      notes || null,
      now
    ).run()
    
    // Handle special status changes
    if (status === 'completed') {
      // Update wash distribution for subscription appointments
      if (currentAppointment.is_subscription) {
        await DB.prepare(`
          UPDATE wash_distribution
          SET used_washes = used_washes + 1
          WHERE subscription_id IN (
            SELECT id FROM subscriptions 
            WHERE customer_id = ? AND status = 'active'
          )
          AND car_id = ?
        `).bind(currentAppointment.customer_id, currentAppointment.car_id).run()
      }
      
      // Award loyalty points
      const service = await DB.prepare(`
        SELECT price FROM services WHERE id = ?
      `).bind(currentAppointment.service_id).first()
      
      if (service) {
        const pointsEarned = Math.floor(service.price * 0.1) // 10% of service price
        
        await DB.prepare(`
          UPDATE loyalty_points
          SET points_balance = points_balance + ?, total_earned = total_earned + ?
          WHERE customer_id = ?
        `).bind(pointsEarned, pointsEarned, currentAppointment.customer_id).run()
        
        await DB.prepare(`
          INSERT INTO points_transactions (id, customer_id, transaction_type, points_amount, description, created_at)
          VALUES (?, ?, 'earned', ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          currentAppointment.customer_id,
          pointsEarned,
          `نقاط من خدمة ${status}`,
          now
        ).run()
      }
    }
    
    return c.json({
      success: true,
      message: 'Appointment status updated successfully'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to update appointment status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get today's appointments
appointmentRoutes.get('/today/summary', async (c) => {
  const { DB } = c.env
  const { employee_id, status } = c.req.query()
  
  try {
    const today = new Date().toISOString().split('T')[0]
    
    let query = `
      SELECT a.id, a.appointment_time, a.location, a.status, a.is_subscription,
             c.name as customer_name, c.phone as customer_phone,
             cars.model as car_model, cars.type as car_type, cars.plate_number,
             s.name as service_name, s.price as service_price,
             e.name as employee_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN cars ON a.car_id = cars.id
      JOIN services s ON a.service_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.appointment_date = ?
    `
    
    const params = [today]
    
    if (employee_id) {
      query += ' AND a.employee_id = ?'
      params.push(employee_id)
    }
    
    if (status) {
      query += ' AND a.status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY a.appointment_time ASC'
    
    const appointments = await DB.prepare(query).bind(...params).all()
    
    // Group by time slots
    const timeSlots = {}
    appointments.results.forEach(appointment => {
      const timeSlot = appointment.appointment_time.substring(0, 5) // HH:MM format
      if (!timeSlots[timeSlot]) {
        timeSlots[timeSlot] = []
      }
      timeSlots[timeSlot].push(appointment)
    })
    
    // Get summary statistics
    const summary = await DB.prepare(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
      FROM appointments
      WHERE appointment_date = ?
    `).bind(today).first()
    
    return c.json({
      success: true,
      data: {
        appointments: timeSlots,
        summary: summary
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch today\'s appointments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get upcoming appointments
appointmentRoutes.get('/upcoming', async (c) => {
  const { DB } = c.env
  const { days = 7, customer_id, employee_id } = c.req.query()
  
  try {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + parseInt(days))
    
    let query = `
      SELECT a.*, c.name as customer_name, c.phone as customer_phone,
             cars.model as car_model, cars.type as car_type,
             s.name as service_name, s.price as service_price,
             e.name as employee_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN cars ON a.car_id = cars.id
      JOIN services s ON a.service_id = s.id
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.appointment_date >= DATE('now') 
        AND a.appointment_date <= ?
        AND a.status IN ('scheduled', 'confirmed')
    `
    
    const params = [futureDate.toISOString().split('T')[0]]
    
    if (customer_id) {
      query += ' AND a.customer_id = ?'
      params.push(customer_id)
    }
    
    if (employee_id) {
      query += ' AND a.employee_id = ?'
      params.push(employee_id)
    }
    
    query += ' ORDER BY a.appointment_date ASC, a.appointment_time ASC'
    query += ' LIMIT 100'
    
    const appointments = await DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      data: appointments.results,
      count: appointments.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch upcoming appointments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export { appointmentRoutes }