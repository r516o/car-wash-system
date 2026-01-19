import { Hono } from 'hono'

const notificationRoutes = new Hono<{ Bindings: any }>()

// Get notification templates
notificationRoutes.get('/templates', async (c) => {
  const { DB } = c.env
  const { is_active, notification_type } = c.req.query()
  
  try {
    let query = `
      SELECT * FROM notification_templates
      WHERE 1=1
    `
    
    const params = []
    
    if (is_active !== undefined) {
      query += ' AND is_active = ?'
      params.push(is_active === 'true')
    }
    
    if (notification_type) {
      query += ' AND notification_type = ?'
      params.push(notification_type)
    }
    
    query += ' ORDER BY template_key'
    
    const templates = await DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      data: templates.results,
      count: templates.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch notification templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Send notification
notificationRoutes.post('/send', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { recipient_type, recipient_id, template_id, title, message, data, channels } = body
    
    // Validate required fields
    if (!recipient_type || !recipient_id || !title || !message || !channels) {
      return c.json({
        success: false,
        error: 'Missing required fields',
        details: ['recipient_type', 'recipient_id', 'title', 'message', 'channels']
      }, 400)
    }
    
    // Validate recipient type
    const validRecipientTypes = ['customer', 'employee']
    if (!validRecipientTypes.includes(recipient_type)) {
      return c.json({
        success: false,
        error: 'Invalid recipient type',
        details: `Valid types are: ${validRecipientTypes.join(', ')}`
      }, 400)
    }
    
    // Validate channels
    const validChannels = ['push', 'sms', 'email']
    const invalidChannels = channels.filter((ch: string) => !validChannels.includes(ch))
    if (invalidChannels.length > 0) {
      return c.json({
        success: false,
        error: 'Invalid notification channels',
        details: invalidChannels
      }, 400)
    }
    
    const now = new Date().toISOString()
    const notificationId = crypto.randomUUID()
    
    // Create notification record
    await DB.prepare(`
      INSERT INTO notifications (
        id, customer_id, employee_id, type, title, title_en, message, message_en, data, is_read, created_at
      ) VALUES (?, ?, ?, 'custom', ?, ?, ?, ?, ?, FALSE, ?)
    `).bind(
      notificationId,
      recipient_type === 'customer' ? recipient_id : null,
      recipient_type === 'employee' ? recipient_id : null,
      title,
      title,
      message,
      message,
      JSON.stringify(data || {}),
      now
    ).run()
    
    // Add to notification queue for immediate sending
    await DB.prepare(`
      INSERT INTO notification_queue (
        id, recipient_type, recipient_id, template_id, title, message, data, channels, scheduled_for, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      recipient_type,
      recipient_id,
      template_id || null,
      title,
      message,
      JSON.stringify(data || {}),
      JSON.stringify(channels),
      now, // Send immediately
      now
    ).run()
    
    return c.json({
      success: true,
      data: { notification_id: notificationId },
      message: 'Notification sent successfully'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Schedule notification
notificationRoutes.post('/schedule', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { recipient_type, recipient_id, template_id, title, message, data, channels, scheduled_for } = body
    
    // Validate required fields
    if (!recipient_type || !recipient_id || !title || !message || !channels || !scheduled_for) {
      return c.json({
        success: false,
        error: 'Missing required fields',
        details: ['recipient_type', 'recipient_id', 'title', 'message', 'channels', 'scheduled_for']
      }, 400)
    }
    
    // Validate scheduled time
    const scheduledTime = new Date(scheduled_for)
    if (isNaN(scheduledTime.getTime())) {
      return c.json({
        success: false,
        error: 'Invalid scheduled time format'
      }, 400)
    }
    
    const now = new Date().toISOString()
    
    // Add to notification queue
    await DB.prepare(`
      INSERT INTO notification_queue (
        id, recipient_type, recipient_id, template_id, title, message, data, channels, scheduled_for, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      recipient_type,
      recipient_id,
      template_id || null,
      title,
      message,
      JSON.stringify(data || {}),
      JSON.stringify(channels),
      scheduledTime.toISOString(),
      now
    ).run()
    
    return c.json({
      success: true,
      message: 'Notification scheduled successfully'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to schedule notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get notification queue
notificationRoutes.get('/queue', async (c) => {
  const { DB } = c.env
  const { status, recipient_id, scheduled_after, limit = 50 } = c.req.query()
  
  try {
    let query = `
      SELECT nq.*, nt.title_template, nt.message_template
      FROM notification_queue nq
      LEFT JOIN notification_templates nt ON nq.template_id = nt.id
      WHERE 1=1
    `
    
    const params = []
    
    if (status) {
      query += ' AND nq.status = ?'
      params.push(status)
    }
    
    if (recipient_id) {
      query += ' AND nq.recipient_id = ?'
      params.push(recipient_id)
    }
    
    if (scheduled_after) {
      query += ' AND nq.scheduled_for >= ?'
      params.push(scheduled_after)
    }
    
    query += ' ORDER BY nq.scheduled_for DESC'
    query += ' LIMIT ?'
    params.push(limit)
    
    const queue = await DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      data: queue.results,
      count: queue.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch notification queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get notifications for a customer
notificationRoutes.get('/customer/:customer_id', async (c) => {
  const { DB } = c.env
  const { customer_id } = c.req.param()
  const { is_read, limit = 20 } = c.req.query()
  
  try {
    let query = `
      SELECT n.*, nt.title_template, nt.message_template
      FROM notifications n
      LEFT JOIN notification_templates nt ON n.type = nt.template_key
      WHERE n.customer_id = ?
    `
    
    const params = [customer_id]
    
    if (is_read !== undefined) {
      query += ' AND n.is_read = ?'
      params.push(is_read === 'true')
    }
    
    query += ' ORDER BY n.created_at DESC'
    query += ' LIMIT ?'
    params.push(limit)
    
    const notifications = await DB.prepare(query).bind(...params).all()
    
    // Mark notifications as read
    await DB.prepare(`
      UPDATE notifications SET is_read = TRUE
      WHERE customer_id = ? AND is_read = FALSE
    `).bind(customer_id).run()
    
    return c.json({
      success: true,
      data: notifications.results,
      count: notifications.results.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch customer notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Get unread notification count
notificationRoutes.get('/customer/:customer_id/unread-count', async (c) => {
  const { DB } = c.env
  const { customer_id } = c.req.param()
  
  try {
    const count = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE customer_id = ? AND is_read = FALSE
    `).bind(customer_id).first()
    
    return c.json({
      success: true,
      data: { count: count?.count || 0 }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch unread notification count',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Process scheduled notifications (should be called by cron job)
notificationRoutes.post('/process-scheduled', async (c) => {
  const { DB } = c.env
  const { batch_size = 100 } = c.req.json()
  
  try {
    // Get due notifications
    const dueNotifications = await DB.prepare(`
      SELECT * FROM notification_queue
      WHERE status = 'pending' AND scheduled_for <= ?
      ORDER BY scheduled_for ASC
      LIMIT ?
    `).bind(new Date().toISOString(), batch_size).all()
    
    let processedCount = 0
    let successCount = 0
    let failedCount = 0
    
    for (const notification of dueNotifications.results) {
      try {
        // Process notification based on channels
        const channels = JSON.parse(notification.channels)
        
        for (const channel of channels) {
          switch (channel) {
            case 'push':
              // Send push notification via Firebase
              await sendPushNotification(notification)
              break
            case 'sms':
              // Send SMS via Twilio
              await sendSMSNotification(notification)
              break
            case 'email':
              // Send email via SendGrid
              await sendEmailNotification(notification)
              break
          }
        }
        
        // Mark as sent
        await DB.prepare(`
          UPDATE notification_queue
          SET status = 'sent', sent_at = ?, attempts = attempts + 1
          WHERE id = ?
        `).bind(new Date().toISOString(), notification.id).run()
        
        successCount++
      } catch (error) {
        // Mark as failed
        await DB.prepare(`
          UPDATE notification_queue
          SET status = 'failed', attempts = attempts + 1
          WHERE id = ?
        `).bind(notification.id).run()
        
        failedCount++
        console.error(`Failed to process notification ${notification.id}:`, error)
      }
      
      processedCount++
    }
    
    return c.json({
      success: true,
      data: {
        processed: processedCount,
        successful: successCount,
        failed: failedCount
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to process scheduled notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Helper functions for sending notifications
async function sendPushNotification(notification: any) {
  // Implementation for Firebase push notifications
  console.log(`Sending push notification to ${notification.recipient_id}: ${notification.title}`)
  // This would integrate with Firebase Cloud Messaging
  return { success: true }
}

async function sendSMSNotification(notification: any) {
  // Implementation for SMS via Twilio
  console.log(`Sending SMS to ${notification.recipient_id}: ${notification.message}`)
  // This would integrate with Twilio API
  return { success: true }
}

async function sendEmailNotification(notification: any) {
  // Implementation for email via SendGrid
  console.log(`Sending email to ${notification.recipient_id}: ${notification.title}`)
  // This would integrate with SendGrid API
  return { success: true }
}

export { notificationRoutes }