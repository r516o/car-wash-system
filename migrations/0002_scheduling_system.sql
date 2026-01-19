-- Migration: Scheduling and Conflict Prevention System
-- Created: 2026-01-19
-- Description: Advanced scheduling tables with conflict detection and resolution

-- Time slots configuration
CREATE TABLE IF NOT EXISTS time_slots (
  id TEXT PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('morning', 'evening')),
  max_appointments INTEGER DEFAULT 4,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default time slots (6 AM - 7 PM with 2-hour break)
INSERT OR IGNORE INTO time_slots (id, start_time, end_time, slot_type, max_appointments) VALUES
('slot_06_08', '06:00', '08:00', 'morning', 8),
('slot_08_10', '08:00', '10:00', 'morning', 8),
('slot_10_12', '10:00', '12:00', 'morning', 8),
('slot_13_15', '13:00', '15:00', 'evening', 8),
('slot_15_17', '15:00', '17:00', 'evening', 8),
('slot_17_19', '17:00', '19:00', 'evening', 8);

-- Geographic clusters for smart scheduling
CREATE TABLE IF NOT EXISTS geographic_clusters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  center_latitude REAL NOT NULL,
  center_longitude REAL NOT NULL,
  radius_km REAL DEFAULT 5.0,
  max_concurrent_appointments INTEGER DEFAULT 4,
  average_travel_time_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employee availability tracking
CREATE TABLE IF NOT EXISTS employee_availability (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'unavailable')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(employee_id, date, start_time)
);

-- Location availability tracking
CREATE TABLE IF NOT EXISTS location_availability (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  time_slot_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  max_appointments INTEGER DEFAULT 4,
  booked_appointments INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id),
  FOREIGN KEY (cluster_id) REFERENCES geographic_clusters(id),
  UNIQUE(date, time_slot_id, cluster_id)
);

-- Scheduling constraints
CREATE TABLE IF NOT EXISTS scheduling_constraints (
  id TEXT PRIMARY KEY,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN ('min_gap', 'max_concurrent', 'travel_buffer', 'working_hours')),
  constraint_name TEXT NOT NULL,
  constraint_value INTEGER NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('minutes', 'hours', 'count')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default scheduling constraints
INSERT OR IGNORE INTO scheduling_constraints (id, constraint_type, constraint_name, constraint_value, unit) VALUES
('constraint_min_gap', 'min_gap', 'الحد الأدنى للمباعدة بين المواعيد', 15, 'minutes'),
('constraint_travel_buffer', 'travel_buffer', 'وقت التنقل بين المواقع', 15, 'minutes'),
('constraint_max_concurrent', 'max_concurrent', 'الحد الأقصى للمواعيد المتزامنة', 4, 'count'),
('constraint_working_hours', 'working_hours', 'ساعات العمل اليومية', 12, 'hours');

-- Conflict resolution history
CREATE TABLE IF NOT EXISTS conflict_resolution_history (
  id TEXT PRIMARY KEY,
  original_appointment_id TEXT NOT NULL,
  conflicting_appointment_id TEXT NOT NULL,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('time', 'location', 'employee')),
  resolution_method TEXT NOT NULL CHECK (resolution_method IN ('reschedule', 'reassign', 'cancel', 'manual')),
  resolution_details TEXT,
  resolved_by TEXT NOT NULL,
  resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (original_appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (conflicting_appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Smart scheduling suggestions
CREATE TABLE IF NOT EXISTS scheduling_suggestions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  suggested_date DATE NOT NULL,
  suggested_time TIME NOT NULL,
  suggested_cluster_id TEXT NOTn  confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  suggestion_reason TEXT,
  is_accepted BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (suggested_cluster_id) REFERENCES geographic_clusters(id)
);

-- Subscription scheduling patterns
CREATE TABLE IF NOT EXISTS subscription_scheduling_patterns (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('regular', 'flexible', 'custom')),
  interval_days INTEGER DEFAULT 3,
  preferred_time_slot TEXT,
  cluster_id TEXT,
  auto_schedule BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (cluster_id) REFERENCES geographic_clusters(id)
);

-- Indexes for scheduling performance
CREATE INDEX IF NOT EXISTS idx_appointments_date_cluster ON appointments(appointment_date, cluster_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time_status ON appointments(appointment_time, status);
CREATE INDEX IF NOT EXISTS idx_employee_availability_date ON employee_availability(date, employee_id);
CREATE INDEX IF NOT EXISTS idx_location_availability_date ON location_availability(date, time_slot_id, cluster_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_suggestions_customer ON scheduling_suggestions(customer_id, suggested_date);
CREATE INDEX IF NOT EXISTS idx_subscription_schedules_pattern ON subscription_scheduling_patterns(subscription_id, pattern_type);

-- Insert default geographic clusters (Riyadh areas)
INSERT OR IGNORE INTO geographic_clusters (id, name, name_en, center_latitude, center_longitude, radius_km, max_concurrent_appointments, average_travel_time_minutes) VALUES
('cluster_olaya', 'العليا', 'Olaya', 24.7136, 46.6753, 3.0, 4, 12),
('cluster_malaz', 'الملز', 'Malaz', 24.6541, 46.7154, 3.5, 4, 15),
('cluster_sulaimania', 'السليمانية', 'Sulaimania', 24.6967, 46.6771, 3.0, 4, 10),
('cluster_alfaisaliah', 'الفيصلية', 'Al-Faisaliah', 24.6889, 46.6856, 2.5, 3, 8),
('cluster_nahda', 'النهضة', 'Nahda', 24.7433, 46.6525, 4.0, 4, 18),
('cluster_rawdah', 'الروضة', 'Rawdah', 24.6694, 46.7025, 3.0, 4, 12),
('cluster_moraba', 'المربع', 'Murabba', 24.6500, 46.7100, 3.0, 4, 14),
('cluster_qurtuba', 'قرطبة', 'Qurtuba', 24.8000, 46.6500, 4.0, 4, 20);