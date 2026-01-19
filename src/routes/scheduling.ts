import { Hono } from 'hono'
import { z } from 'zod'

const schedulingRoutes = new Hono<{ Bindings: any }>()

// Scheduling validation schemas
const appointmentSchema = z.object({
  customer_id: z.string().uuid(),
  car_id: z.string().uuid(),
  service_id: z.string().uuid(),
  employee_id: z.string().uuid().optional(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().min(5).max(255),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  is_subscription: z.boolean().default(false),
  notes: z.string().optional()
})

const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cluster_id: z.string().optional(),
  time_slot_id: z.string().optional()
})

// Check availability for scheduling
schedulingRoutes.post('/check-availability', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { date, cluster_id, time_slot_id } = availabilityQuerySchema.parse(body)
    
    // Get scheduling constraints
    const constraints = await DB.prepare(`
      SELECT constraint_type, constraint_value, unit
      FROM scheduling_constraints
      WHERE is_active = TRUE
    `).all()
    
    const constraintMap = constraints.results.reduce((acc, constraint) => {
      acc[constraint.constraint_type] = constraint
      return acc
    }, {})
    
    const minGap = constraintMap['min_gap']?.constraint_value || 15
    const travelBuffer = constraintMap['travel_buffer']?.constraint_value || 15
    const maxConcurrent = constraintMap['max_concurrent']?.constraint_value || 4
    
    // Get available time slots
    const timeSlots = await DB.prepare(`
      SELECT ts.*, 
             COALESCE(la.max_appointments, ts.max_appointments) as max_appointments,
             COALESCE(la.booked_appointments, 0) as booked_appointments
      FROM time_slots ts
      LEFT JOIN location_availability la ON (
        ts.id = la.time_slot_id AND 
        la.date = ? AND 
        la.cluster_id = ?
      )
      WHERE ts.is_active = TRUE
      ORDER BY ts.start_time
    `).bind(date, cluster_id).all()
    
    // Get available employees
    const employees = await DB.prepare(`
      SELECT e.id, e.name, 
             CASE WHEN ea.id IS NULL THEN 'available' ELSE ea.status END as availability_status
      FROM employees e
      LEFT JOIN employee_availability ea ON (
        e.id = ea.employee_id AND 
        ea.date = ? AND 
        ea.status = 'available'
      )
      WHERE e.status = 'active'
      ORDER BY e.name
    `).bind(date).all()
    
    // Get existing appointments for conflict detection
    const existingAppointments = await DB.prepare(`
      SELECT a.id, a.employee_id, a.appointment_time, a.duration_minutes,
             a.location, a.latitude, a.longitude, a.cluster_id
      FROM appointments a
      WHERE a.appointment_date = ? AND a.status IN ('scheduled', 'confirmed', 'in_progress')
      ORDER BY a.appointment_time
    `).bind(date).all()
    
    // Calculate availability with conflict detection
    const availability = {
      time_slots: timeSlots.results.map(slot => ({
        ...slot,
        available_slots: Math.max(0, slot.max_appointments - slot.booked_appointments),
        is_available: (slot.booked_appointments || 0) < slot.max_appointments
      })),
      employees: employees.results,
      constraints: {
        min_gap_minutes: minGap,
        travel_buffer_minutes: travelBuffer,
        max_concurrent_appointments: maxConcurrent
      },
      existing_appointments_count: existingAppointments.results.length
    }
    
    return c.json({
      success: true,
      data: availability
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
      error: 'Failed to check availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Check for appointment conflicts
schedulingRoutes.post('/check-conflicts', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { appointment_date, appointment_time, employee_id, location, latitude, longitude } = body
    
    // Get scheduling constraints
    const constraints = await DB.prepare(`
      SELECT constraint_type, constraint_value, unit
      FROM scheduling_constraints
      WHERE is_active = TRUE
    `).all()
    
    const constraintMap = constraints.results.reduce((acc, constraint) => {
      acc[constraint.constraint_type] = constraint
      return acc
    }, {})
    
    const minGap = constraintMap['min_gap']?.constraint_value || 15
    const travelBuffer = constraintMap['travel_buffer']?.constraint_value || 15
    
    // Find potential conflicts
    const conflicts = await DB.prepare(`
      SELECT a.id, a.customer_id, a.appointment_time, a.location, a.employee_id,
             c.name as customer_name, c.phone as customer_phone
      FROM appointments a
      JOIN customers c ON a.customer_id = c.id
      WHERE a.appointment_date = ? 
        AND a.status IN ('scheduled', 'confirmed', 'in_progress')
        AND (
          -- Time conflict
          ABS(TIME(a.appointment_time) - TIME(?)) < ?
          OR
          -- Employee conflict
          (a.employee_id = ? AND a.id != ?)
          OR
          -- Location conflict (simplified - in real system use geographic distance)
          (a.location = ? AND ABS(TIME(a.appointment_time) - TIME(?)) < ?)
        )
      ORDER BY a.appointment_time
    `).bind(
      appointment_date,
      appointment_time,
      minGap,
      employee_id,
      body.id || '', // Exclude current appointment if updating
      location,
      appointment_time,
      travelBuffer
    ).all()
    
    // Analyze conflicts
    const conflictAnalysis = {
      has_conflicts: conflicts.results.length > 0,
      conflicts: conflicts.results.map(conflict => ({
        ...conflict,
        conflict_type: conflict.employee_id === employee_id ? 'employee' : 
                      conflict.location === location ? 'location' : 'time',
        time_difference: Math.abs(
          new Date(`2000-01-01T${conflict.appointment_time}`).getTime() - 
          new Date(`2000-01-01T${appointment_time}`).getTime()
        ) / (1000 * 60) // minutes
      })),
      suggestions: []
    }
    
    // Generate suggestions if conflicts found
    if (conflictAnalysis.has_conflicts) {
      const suggestions = await generateConflictResolutions(DB, body, conflicts.results)
      conflictAnalysis.suggestions = suggestions
    }
    
    return c.json({
      success: true,
      data: conflictAnalysis
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to check conflicts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Generate conflict resolution suggestions
async function generateConflictResolutions(DB: D1Database, newAppointment: any, conflicts: any[]) {
  const suggestions = []
  
  // Get available time slots
  const availableSlots = await DB.prepare(`
    SELECT ts.*, 
           COALESCE(la.max_appointments, ts.max_appointments) as max_appointments,
           COALESCE(la.booked_appointments, 0) as booked_appointments
    FROM time_slots ts
    LEFT JOIN location_availability la ON (
      ts.id = la.time_slot_id AND 
      la.date = ? AND 
      la.cluster_id = 'cluster_olaya'
    )
    WHERE ts.is_active = TRUE AND (COALESCE(la.booked_appointments, 0) < COALESCE(la.max_appointments, ts.max_appointments))
    ORDER BY ts.start_time
  `).bind(newAppointment.appointment_date).all()
  
  // Get available employees
  const availableEmployees = await DB.prepare(`
    SELECT e.id, e.name
    FROM employees e
    LEFT JOIN employee_availability ea ON (
      e.id = ea.employee_id AND 
      ea.date = ? AND 
      ea.status = 'available'
    )
    WHERE e.status = 'active'
      AND e.id NOT IN (${conflicts.map(() => '?').join(',')})
    ORDER BY e.name
  `).bind(newAppointment.appointment_date, ...conflicts.map(c => c.employee_id)).all()
  
  // Suggest alternative times
  if (availableSlots.results.length > 0) {
    suggestions.push({
      type: 'alternative_time',
      description: 'اختر وقتاً مختلفاً',
      options: availableSlots.results.slice(0, 3).map(slot => ({
        time: slot.start_time,
        available_slots: slot.max_appointments - slot.booked_appointments
      }))
    })
  }
  
  // Suggest alternative employees
  if (availableEmployees.results.length > 0) {
    suggestions.push({
      type: 'alternative_employee',
      description: 'اختر موظفاً مختلفاً',
      options: availableEmployees.results.slice(0, 3).map(emp => ({
        employee_id: emp.id,
        employee_name: emp.name
      }))
    })
  }
  
  // Suggest alternative dates
  const nextDay = new Date(newAppointment.appointment_date)
  nextDay.setDate(nextDay.getDate() + 1)
  
  suggestions.push({
    type: 'alternative_date',
    description: 'اختر تاريخاً مختلفاً',
    options: [
      { date: nextDay.toISOString().split('T')[0], day_name: 'غداً' },
      { date: new Date(nextDay.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], day_name: 'بعد غد' }
    ]
  })
  
  return suggestions
}

// Smart scheduling for subscriptions
schedulingRoutes.post('/schedule-subscription', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { subscription_id, start_date, end_date } = body
    
    // Get subscription details
    const subscription = await DB.prepare(`
      SELECT s.*, c.name as customer_name, c.phone, c.preferred_time,
             sp.total_washes, sp.name as package_name
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN subscription_packages sp ON s.package_id = sp.id
      WHERE s.id = ? AND s.status = 'active'
    `).bind(subscription_id).first()
    
    if (!subscription) {
      return c.json({
        success: false,
        error: 'Active subscription not found'
      }, 404)
    }
    
    // Get customer's cars
    const cars = await DB.prepare(`
      SELECT cars.*, wd.allocated_washes, wd.used_washes
      FROM cars
      LEFT JOIN wash_distribution wd ON (cars.id = wd.car_id AND wd.subscription_id = ?)
      WHERE cars.customer_id = ?
      ORDER BY cars.created_at
    `).bind(subscription_id, subscription.customer_id).all()
    
    // Get scheduling pattern
    const pattern = await DB.prepare(`
      SELECT * FROM subscription_scheduling_patterns
      WHERE subscription_id = ?
    `).bind(subscription_id).first()
    
    const intervalDays = pattern?.interval_days || 3
    const preferredTime = subscription.preferred_time || 'morning'
    const clusterId = pattern?.cluster_id || 'cluster_olaya'
    
    // Generate appointment dates
    const appointments = []
    const currentDate = new Date(start_date)
    const endDate = new Date(end_date)
    const totalWashesNeeded = subscription.total_washes - subscription.used_washes
    
    let washesScheduled = 0
    let lastAppointmentDate = null
    
    while (currentDate <= endDate && washesScheduled < totalWashesNeeded) {
      // Skip if this is too close to the last appointment
      if (lastAppointmentDate) {
        const daysDiff = Math.floor((currentDate - lastAppointmentDate) / (1000 * 60 * 60 * 24))
        if (daysDiff < intervalDays) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }
      }
      
      // Find available time slot
      const timeSlot = await DB.prepare(`
        SELECT ts.*, 
               COALESCE(la.max_appointments, ts.max_appointments) as max_appointments,
               COALESCE(la.booked_appointments, 0) as booked_appointments
        FROM time_slots ts
        LEFT JOIN location_availability la ON (
          ts.id = la.time_slot_id AND 
          la.date = ? AND 
          la.cluster_id = ?
        )
        WHERE ts.is_active = TRUE
          AND ts.slot_type = ?
          AND (COALESCE(la.booked_appointments, 0) < COALESCE(la.max_appointments, ts.max_appointments))
        ORDER BY ts.start_time
        LIMIT 1
      `).bind(
        currentDate.toISOString().split('T')[0],
        clusterId,
        preferredTime
      ).first()
      
      if (timeSlot) {
        // Find available employee
        const employee = await DB.prepare(`
          SELECT e.id, e.name
          FROM employees e
          LEFT JOIN employee_availability ea ON (
            e.id = ea.employee_id AND 
            ea.date = ? AND 
            ea.status = 'available'
          )
          WHERE e.status = 'active'
          ORDER BY RANDOM()
          LIMIT 1
        `).bind(currentDate.toISOString().split('T')[0]).first()
        
        if (employee) {
          // Select car for this appointment (round-robin)
          const availableCars = cars.results.filter(car => 
            (car.allocated_washes || 0) > (car.used_washes || 0)
          )
          
          if (availableCars.length > 0) {
            const selectedCar = availableCars[washesScheduled % availableCars.length]
            
            appointments.push({
              subscription_id: subscription_id,
              customer_id: subscription.customer_id,
              car_id: selectedCar.id,
              service_id: 'svc_basic', // Default service for subscriptions
              employee_id: employee.id,
              appointment_date: currentDate.toISOString().split('T')[0],
              appointment_time: timeSlot.start_time,
              location: 'Customer Location', // Should be customer's preferred location
              is_subscription: true,
              notes: `Subscription appointment - ${subscription.package_name}`
            })
            
            washesScheduled++
            lastAppointmentDate = new Date(currentDate)
          }
        }
      }
      
      currentDate.setDate(currentDate.getDate() + intervalDays)
    }
    
    return c.json({
      success: true,
      data: {
        subscription_id: subscription_id,
        total_scheduled: washesScheduled,
        appointments: appointments,
        coverage_percentage: Math.round((washesScheduled / totalWashesNeeded) * 100)
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to schedule subscription appointments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get scheduling suggestions
customerRoutes.get('/suggestions', async (c) => {
  const { DB } = c.env
  const { customer_id, date, service_type } = c.req.query()
  
  try {
    if (!customer_id) {
      return c.json({
        success: false,
        error: 'Customer ID is required'
      }, 400)
    }
    
    // Get customer preferences
    const customer = await DB.prepare(`
      SELECT preferred_time, language
      FROM customers
      WHERE id = ?
    `).bind(customer_id).first()
    
    if (!customer) {
      return c.json({
        success: false,
        error: 'Customer not found'
      }, 404)
    }
    
    const targetDate = date || new Date().toISOString().split('T')[0]
    const preferredTime = customer.preferred_time || 'morning'
    
    // Get available time slots
    const availableSlots = await DB.prepare(`
      SELECT ts.*, 
             COALESCE(la.max_appointments, ts.max_appointments) as max_appointments,
             COALESCE(la.booked_appointments, 0) as booked_appointments
      FROM time_slots ts
      LEFT JOIN location_availability la ON (
        ts.id = la.time_slot_id AND 
        la.date = ?
      )
      WHERE ts.is_active = TRUE
        AND ts.slot_type = ?
        AND (COALESCE(la.booked_appointments, 0) < COALESCE(la.max_appointments, ts.max_appointments))
      ORDER BY ts.start_time
      LIMIT 5
    `).bind(targetDate, preferredTime).all()
    
    // Get available employees
    const availableEmployees = await DB.prepare(`
      SELECT e.id, e.name
      FROM employees e
      LEFT JOIN employee_availability ea ON (
        e.id = ea.employee_id AND 
        ea.date = ? AND 
        ea.status = 'available'
      )
      WHERE e.status = 'active'
      ORDER BY e.name
    `).bind(targetDate).all()
    
    // Get customer's cars
    const cars = await DB.prepare(`
      SELECT id, model, type, color
      FROM cars
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `).bind(customer_id).all()
    
    // Check for active subscription
    const subscription = await DB.prepare(`
      SELECT s.*, sp.name as package_name
      FROM subscriptions s
      JOIN subscription_packages sp ON s.package_id = sp.id
      WHERE s.customer_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `).bind(customer_id).first()
    
    const suggestions = {
      customer_preferences: customer,
      available_time_slots: availableSlots.results,
      available_employees: availableEmployees.results,
      customer_cars: cars.results,
      active_subscription: subscription,
      recommended_services: [
        { id: 'svc_basic', name: 'غسيل عادي', name_en: 'Basic Wash', price: 50 },
        { id: 'svc_detailed', name: 'غسيل تفصيلي', name_en: 'Detailed Wash', price: 80 },
        { id: 'svc_full', name: 'باقة كاملة', name_en: 'Full Package', price: 200 }
      ]
    }
    
    return c.json({
      success: true,
      data: suggestions
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get scheduling suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export { schedulingRoutes }