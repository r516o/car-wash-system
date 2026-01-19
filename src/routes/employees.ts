import { Hono } from 'hono'

const employeeRoutes = new Hono<{ Bindings: any }>()

// Get all employees
employeeRoutes.get('/', async (c) => {
  const { DB } = c.env
  const { role, status } = c.req.query()
  
  try {
    let query = `
      SELECT e.id, e.name, e.phone, e.email, e.role, e.status, e.working_hours,
             COUNT(a.id) as today_appointments,
             AVG(r.rating) as average_rating
      FROM employees e
      LEFT JOIN appointments a ON (e.id = a.employee_id AND a.appointment_date = DATE('now'))
      LEFT JOIN ratings r ON (a.id = r.appointment_id)
      WHERE 1=1
    `
    
    const params = []
    
    if (role) {
      query += ' AND e.role = ?'
      params.push(role)
    }
    
    if (status) {
      query += ' AND e.status = ?'
      params.push(status)
    }
    
    query += ' GROUP BY e.id ORDER BY e.name'
    
    const employees = await DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      data: employees.results,
      count: employees.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch employees',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get employee by ID
employeeRoutes.get('/:id', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const employee = await DB.prepare(`
      SELECT e.*, 
             COUNT(CASE WHEN a.appointment_date = DATE('now') THEN a.id END) as today_appointments,
             COUNT(CASE WHEN a.appointment_date >= DATE('now', '-7 days') THEN a.id END) as weekly_appointments,
             AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating END) as average_rating
      FROM employees e
      LEFT JOIN appointments a ON e.id = a.employee_id
      LEFT JOIN ratings r ON a.id = r.appointment_id
      WHERE e.id = ?
      GROUP BY e.id
    `).bind(id).first()
    
    if (!employee) {
      return c.json({
        success: false,
        error: 'Employee not found'
      }, 404)
    }
    
    // Get work schedule
    const workSchedule = await DB.prepare(`
      SELECT * FROM work_schedules
      WHERE employee_id = ? AND is_active = TRUE
      ORDER BY day_of_week
    `).bind(id).all()
    
    // Get recent appointments
    const recentAppointments = await DB.prepare(`
      SELECT a.*, c.name as customer_name, cars.model as car_model, s.name as service_name
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN cars ON a.car_id = cars.id
      JOIN services s ON a.service_id = s.id
      WHERE a.employee_id = ? AND a.appointment_date >= DATE('now', '-7 days')
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 10
    `).bind(id).all()
    
    // Get performance metrics
    const metrics = await DB.prepare(`
      SELECT * FROM employee_metrics
      WHERE employee_id = ? AND metric_date >= DATE('now', '-30 days')
      ORDER BY metric_date DESC
      LIMIT 30
    `).bind(id).all()
    
    return c.json({
      success: true,
      data: {
        ...employee,
        work_schedule: workSchedule.results,
        recent_appointments: recentAppointments.results,
        performance_metrics: metrics.results
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch employee details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Create new employee
employeeRoutes.post('/', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { name, phone, email, role, working_hours } = body
    
    // Validate required fields
    if (!name || !phone || !role) {
      return c.json({
        success: false,
        error: 'Missing required fields',
        details: ['name', 'phone', 'role']
      }, 400)
    }
    
    // Validate role
    const validRoles = ['admin', 'employee']
    if (!validRoles.includes(role)) {
      return c.json({
        success: false,
        error: 'Invalid role',
        details: `Valid roles are: ${validRoles.join(', ')}`
      }, 400)
    }
    
    // Check if phone already exists
    const existingEmployee = await DB.prepare(`
      SELECT id FROM employees WHERE phone = ?
    `).bind(phone).first()
    
    if (existingEmployee) {
      return c.json({
        success: false,
        error: 'Phone number already exists'
      }, 409)
    }
    
    const employeeId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    await DB.prepare(`
      INSERT INTO employees (id, name, phone, email, role, working_hours, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
      employeeId,
      name,
      phone,
      email || null,
      role,
      working_hours ? JSON.stringify(working_hours) : null,
      now,
      now
    ).run()
    
    // Create work schedule if provided
    if (working_hours && Array.isArray(working_hours)) {
      for (const schedule of working_hours) {
        await DB.prepare(`
          INSERT INTO work_schedules (id, employee_id, day_of_week, start_time, end_time, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          employeeId,
          schedule.day_of_week,
          schedule.start_time,
          schedule.end_time,
          now
        ).run()
      }
    }
    
    return c.json({
      success: true,
      data: { id: employeeId, name, phone, email, role },
      message: 'Employee created successfully'
    }, 201)
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return c.json({
        success: false,
        error: 'Phone number already exists'
      }, 409)
    }
    
    return c.json({
      success: false,
      error: 'Failed to create employee',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Update employee
appointmentRoutes.put('/:id', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const body = await c.req.json()
    const { name, phone, email, role, status, working_hours } = body
    
    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'employee']
      if (!validRoles.includes(role)) {
        return c.json({
          success: false,
          error: 'Invalid role',
          details: `Valid roles are: ${validRoles.join(', ')}`
        }, 400)
      }
    }
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'inactive']
      if (!validStatuses.includes(status)) {
        return c.json({
          success: false,
          error: 'Invalid status',
          details: `Valid statuses are: ${validStatuses.join(', ')}`
        }, 400)
      }
    }
    
    const now = new Date().toISOString()
    
    // Build dynamic update query
    const updates = []
    const values = []
    
    if (name) {
      updates.push('name = ?')
      values.push(name)
    }
    
    if (phone) {
      // Check if phone already exists for another employee
      const existingPhone = await DB.prepare(`
        SELECT id FROM employees WHERE phone = ? AND id != ?
      `).bind(phone, id).first()
      
      if (existingPhone) {
        return c.json({
          success: false,
          error: 'Phone number already exists'
        }, 409)
      }
      
      updates.push('phone = ?')
      values.push(phone)
    }
    
    if (email !== undefined) {
      updates.push('email = ?')
      values.push(email)
    }
    
    if (role) {
      updates.push('role = ?')
      values.push(role)
    }
    
    if (status) {
      updates.push('status = ?')
      values.push(status)
    }
    
    if (working_hours) {
      updates.push('working_hours = ?')
      values.push(JSON.stringify(working_hours))
    }
    
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
      UPDATE employees SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run()
    
    if (result.changes === 0) {
      return c.json({
        success: false,
        error: 'Employee not found'
      }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Employee updated successfully'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to update employee',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get employee's today's appointments
employeeRoutes.get('/:id/today', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const appointments = await DB.prepare(`
      SELECT a.id, a.appointment_time, a.location, a.status, a.is_subscription,
             c.name as customer_name, c.phone as customer_phone,
             cars.model as car_model, cars.type as car_type, cars.plate_number,
             s.name as service_name, s.duration_minutes
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      JOIN cars ON a.car_id = cars.id
      JOIN services s ON a.service_id = s.id
      WHERE a.employee_id = ? AND a.appointment_date = ?
      ORDER BY a.appointment_time ASC
    `).bind(id, today).all()
    
    // Group by time slots
    const timeSlots = {}
    appointments.results.forEach(appointment => {
      const timeSlot = appointment.appointment_time.substring(0, 5)
      if (!timeSlots[timeSlot]) {
        timeSlots[timeSlot] = []
      }
      timeSlots[timeSlot].push(appointment)
    })
    
    return c.json({
      success: true,
      data: timeSlots,
      total_count: appointments.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch today\'s appointments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Update employee availability
employeeRoutes.post('/:id/availability', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  
  try {
    const body = await c.req.json()
    const { date, start_time, end_time, status, notes } = body
    
    // Validate required fields
    if (!date || !start_time || !end_time || !status) {
      return c.json({
        success: false,
        error: 'Missing required fields',
        details: ['date', 'start_time', 'end_time', 'status']
      }, 400)
    }
    
    // Validate status
    const validStatuses = ['available', 'busy', 'unavailable']
    if (!validStatuses.includes(status)) {
      return c.json({
        success: false,
        error: 'Invalid status',
        details: `Valid statuses are: ${validStatuses.join(', ')}`
      }, 400)
    }
    
    const now = new Date().toISOString()
    
    // Check if availability already exists
    const existingAvailability = await DB.prepare(`
      SELECT id FROM employee_availability
      WHERE employee_id = ? AND date = ? AND start_time = ?
    `).bind(id, date, start_time).first()
    
    if (existingAvailability) {
      // Update existing availability
      await DB.prepare(`
        UPDATE employee_availability
        SET end_time = ?, status = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).bind(end_time, status, notes || null, now, existingAvailability.id).run()
    } else {
      // Create new availability
      await DB.prepare(`
        INSERT INTO employee_availability (id, employee_id, date, start_time, end_time, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        id,
        date,
        start_time,
        end_time,
        status,
        notes || null,
        now,
        now
      ).run()
    }
    
    return c.json({
      success: true,
      message: 'Employee availability updated successfully'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to update employee availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get employee performance metrics
employeeRoutes.get('/:id/performance', async (c) => {
  const { DB } = c.env
  const { id } = c.req.param()
  const { start_date, end_date } = c.req.query()
  
  try {
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = end_date || new Date().toISOString().split('T')[0]
    
    const metrics = await DB.prepare(`
      SELECT 
        DATE(a.appointment_date) as date,
        COUNT(*) as completed_appointments,
        AVG(r.rating) as average_rating,
        SUM(s.price) as total_revenue,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as on_time_count
      FROM appointments a
      LEFT JOIN ratings r ON a.id = r.appointment_id
      JOIN services s ON a.service_id = s.id
      WHERE a.employee_id = ? 
        AND a.appointment_date >= ? 
        AND a.appointment_date <= ?
        AND a.status = 'completed'
      GROUP BY DATE(a.appointment_date)
      ORDER BY date DESC
    `).bind(id, startDate, endDate).all()
    
    return c.json({
      success: true,
      data: metrics.results
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch employee performance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export { employeeRoutes }