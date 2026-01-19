-- Migration: Advanced Features - Notifications, Points, Analytics
-- Created: 2026-01-19
-- Description: Enhanced features for notifications, loyalty points, and analytics

-- Loyalty points system
CREATE TABLE IF NOT EXISTS loyalty_points (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  points_balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_redeemed INTEGER DEFAULT 0,
  tier_level TEXT DEFAULT 'bronze' CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Points transactions
CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'bonus')),
  points_amount INTEGER NOT NULL,
  description TEXT,
  description_en TEXT,
  reference_id TEXT,
  reference_type TEXT,
  expiry_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Referral system
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_phone TEXT NOT NULL,
  referred_customer_id TEXT,
  referral_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  bonus_points INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (referrer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Promotional codes
CREATE TABLE IF NOT EXISTS promotional_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  description_en TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  minimum_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer promotional code usage
CREATE TABLE IF NOT EXISTS promotional_code_usage (
  id TEXT PRIMARY KEY,
  promotional_code_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  appointment_id TEXT,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promotional_code_id) REFERENCES promotional_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  UNIQUE(promotional_code_id, customer_id)
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'integer', 'decimal', 'boolean', 'json')),
  description TEXT,
  category TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (id, setting_key, setting_value, setting_type, description, category, is_public) VALUES
('setting_business_hours', 'business_hours', '{"start": "06:00", "end": "19:00", "break_start": "12:00", "break_end": "14:00"}', 'json', 'Business operating hours', 'business', FALSE),
('setting_max_concurrent', 'max_concurrent_appointments', '4', 'integer', 'Maximum concurrent appointments per time slot', 'scheduling', FALSE),
('setting_min_gap', 'min_appointment_gap', '15', 'integer', 'Minimum gap between appointments in minutes', 'scheduling', FALSE),
('setting_travel_buffer', 'travel_buffer_time', '15', 'integer', 'Travel time buffer between locations in minutes', 'scheduling', FALSE),
('setting_cancel_hours', 'cancellation_hours_before', '24', 'integer', 'Hours before appointment that cancellation is allowed', 'policy', TRUE),
('setting_points_ratio', 'points_earning_ratio', '1', 'decimal', 'Points earned per SAR spent', 'loyalty', TRUE),
('setting_referral_bonus', 'referral_bonus_points', '100', 'integer', 'Bonus points for successful referral', 'loyalty', TRUE);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY,
  template_key TEXT UNIQUE NOT NULL,
  title_template TEXT NOT NULL,
  title_template_en TEXT NOT NULL,
  message_template TEXT NOT NULL,
  message_template_en TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'push')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default notification templates
INSERT OR IGNORE INTO notification_templates (id, template_key, title_template, title_template_en, message_template, message_template_en, notification_type) VALUES
('tmpl_appointment_reminder', 'appointment_reminder_24h', 'تذكير بموعد الغسيل', 'Appointment Reminder', 'موعدك المقرر غداً الساعة {time} في {location}', 'Your appointment is scheduled tomorrow at {time} in {location}', 'push'),
('tmpl_appointment_confirmed', 'appointment_confirmed', 'تم تأكيد الموعد', 'Appointment Confirmed', 'تم تأكيد موعدك يوم {date} الساعة {time}', 'Your appointment on {date} at {time} has been confirmed', 'push'),
('tmpl_subscription_expiry', 'subscription_expiry_7d', 'انتهاء الاشتراك قريباً', 'Subscription Expiring Soon', 'اشتراكك ينتهي خلال 7 أيام، قم بالتجديد الآن', 'Your subscription expires in 7 days, renew now', 'push'),
('tmpl_service_completed', 'service_completed', 'تمت الخدمة بنجاح', 'Service Completed', 'تمت خدمة سيارتك بنجاح، شكراً لثقتك بنا', 'Your car service has been completed successfully, thank you for your trust', 'push');

-- Scheduled notifications queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'employee')),
  recipient_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT, -- JSON data for template variables
  channels TEXT NOT NULL, -- JSON array of channels: ['push', 'sms', 'email']
  scheduled_for DATETIME NOT NULL,
  sent_at DATETIME,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES notification_templates(id)
);

-- Analytics events tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  user_id TEXT,
  user_type TEXT CHECK (user_type IN ('customer', 'employee')),
  session_id TEXT,
  event_data TEXT, -- JSON data specific to event
  metadata TEXT, -- JSON metadata like device, location, etc.
  occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Business metrics aggregation
CREATE TABLE IF NOT EXISTS business_metrics (
  id TEXT PRIMARY KEY,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('daily', 'weekly', 'monthly')),
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service area pricing
CREATE TABLE IF NOT EXISTS service_area_pricing (
  id TEXT PRIMARY KEY,
  service_area_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  surge_multiplier DECIMAL(4,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_area_id) REFERENCES service_areas(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(service_area_id, service_id)
);

-- Customer preferences
CREATE TABLE IF NOT EXISTS customer_preferences (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL,
  preference_type TEXT NOT NULL CHECK (preference_type IN ('boolean', 'string', 'integer', 'json')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE(customer_id, preference_key)
);

-- Employee performance metrics
CREATE TABLE IF NOT EXISTS employee_metrics (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  metric_date DATE NOT NULL,
  appointments_completed INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  on_time_percentage DECIMAL(5,2) DEFAULT 0,
  customer_satisfaction DECIMAL(5,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(employee_id, metric_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_customer ON points_transactions(customer_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_promotional_codes_active ON promotional_codes(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(metric_date, metric_type);
CREATE INDEX IF NOT EXISTS idx_employee_metrics_date ON employee_metrics(employee_id, metric_date);