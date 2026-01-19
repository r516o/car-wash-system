-- Migration: Initial Schema for Mobile Car Wash Management System
-- Created: 2026-01-19
-- Description: Complete database schema for managing car wash subscriptions, appointments, and scheduling

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  preferred_time TEXT CHECK (preferred_time IN ('morning', 'evening')),
  language TEXT DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cars table
CREATE TABLE IF NOT EXISTS cars (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  plate_number TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Subscription packages
CREATE TABLE IF NOT EXISTS subscription_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  description_en TEXT,
  total_washes INTEGER NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  total_washes INTEGER NOT NULL,
  used_washes INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES subscription_packages(id)
);

-- Wash distribution (how washes are allocated between cars)
CREATE TABLE IF NOT EXISTS wash_distribution (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  car_id TEXT NOT NULL,
  allocated_washes INTEGER NOT NULL,
  used_washes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
  UNIQUE(subscription_id, car_id)
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  description_en TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_subscription BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  working_hours TEXT, -- JSON array of working hours per day
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers who are also employees (for admin access)
CREATE TABLE IF NOT EXISTS customer_employees (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(customer_id, employee_id)
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  car_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  employee_id TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 20,
  location TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  is_subscription BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Appointment conflicts tracking
CREATE TABLE IF NOT EXISTS appointment_conflicts (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  conflicting_appointment_id TEXT NOT NULL,
  conflict_type TEXT CHECK (conflict_type IN ('time', 'location', 'employee')),
  resolved BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (conflicting_appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Pricing rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('area', 'time', 'car_type', 'quantity')),
  condition_value TEXT NOT NULL,
  price_modifier DECIMAL(5,2) NOT NULL,
  modifier_type TEXT NOT NULL CHECK (modifier_type IN ('percentage', 'fixed')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  appointment_id TEXT,
  subscription_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'apple_pay', 'google_pay', 'stc_pay')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,
  payment_gateway TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- Ratings and reviews
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT, -- JSON array of image URLs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE(appointment_id)
);

-- Employee assignments
CREATE TABLE IF NOT EXISTS employee_assignments (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  appointment_id TEXT NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  UNIQUE(appointment_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  employee_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('appointment_reminder', 'appointment_confirmation', 'appointment_cancellation', 'subscription_expiry', 'service_completed')),
  title TEXT NOT NULL,
  title_en TEXT,
  message TEXT NOT NULL,
  message_en TEXT,
  data TEXT, -- JSON data for notification
  is_read BOOLEAN DEFAULT FALSE,
  scheduled_at DATETIME,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Work schedules
CREATE TABLE IF NOT EXISTS work_schedules (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(employee_id, day_of_week)
);

-- Geographic service areas
CREATE TABLE IF NOT EXISTS service_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  description_en TEXT,
  polygon_coordinates TEXT, -- GeoJSON polygon
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values TEXT, -- JSON of old values
  new_values TEXT, -- JSON of new values
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'employee')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_cars_customer_id ON cars(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_ratings_appointment_id ON ratings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);

-- Insert default subscription packages
INSERT OR IGNORE INTO subscription_packages (id, name, name_en, description, description_en, total_washes, monthly_price) VALUES
('pkg_basic', 'الباقة الأساسية', 'Basic Package', '10 غسلات شهرياً', '10 washes monthly', 10, 500.00),
('pkg_premium', 'الباقة المميزة', 'Premium Package', '15 غسلة شهرياً', '15 washes monthly', 15, 700.00),
('pkg_family', 'الباقة العائلية', 'Family Package', '20 غسلة شهرياً', '20 washes monthly', 20, 900.00);

-- Insert default services
INSERT OR IGNORE INTO services (id, name, name_en, description, description_en, price, duration_minutes, is_subscription) VALUES
('svc_basic', 'غسيل عادي', 'Basic Wash', 'غسيل خارجي بسيط', 'Basic exterior wash', 50.00, 20, TRUE),
('svc_detailed', 'غسيل تفصيلي', 'Detailed Wash', 'غسيل داخلي وخارجي تفصيلي', 'Detailed interior and exterior wash', 80.00, 45, FALSE),
('svc_sanitize', 'تعقيم وتعطير', 'Sanitization', 'تعقيم شامل للسيارة', 'Complete car sanitization', 40.00, 15, FALSE),
('svc_polish', 'تلميع خارجي', 'Exterior Polish', 'تلميع الدهان الخارجي', 'Exterior paint polish', 120.00, 60, FALSE),
('svc_full', 'باقة كاملة', 'Full Package', 'جميع الخدمات السابقة', 'All previous services combined', 200.00, 90, FALSE);