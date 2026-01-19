-- Test data for the car wash management system
INSERT OR IGNORE INTO customers (id, name, phone, email, address, preferred_time, language, created_at, updated_at) VALUES
('cust_001', 'أحمد محمد', '+966501234567', 'ahmed@example.com', 'حي الملز، الرياض', 'morning', 'ar', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('cust_002', 'فاطمة علي', '+966508765432', 'fatima@example.com', 'حي العليا، الرياض', 'evening', 'ar', '2024-01-02 11:00:00', '2024-01-02 11:00:00'),
('cust_003', 'محمد عبدالرحمن', '+966503214569', 'mohammed@example.com', 'حي السليمانية، الرياض', 'morning', 'ar', '2024-01-03 12:00:00', '2024-01-03 12:00:00'),
('cust_004', 'سارة أحمد', '+966509876543', 'sara@example.com', 'حي النهضة، الرياض', 'evening', 'ar', '2024-01-04 13:00:00', '2024-01-04 13:00:00'),
('cust_005', 'خالد سعيد', '+966505432198', 'khaled@example.com', 'حي الروضة، الرياض', 'morning', 'ar', '2024-01-05 14:00:00', '2024-01-05 14:00:00');

-- Insert cars for customers
INSERT OR IGNORE INTO cars (id, customer_id, type, model, year, color, plate_number, notes, created_at) VALUES
('car_001', 'cust_001', 'Sedan', 'Toyota Camry', 2020, 'أبيض', 'ABC 123', 'نظيفة جداً', '2024-01-01 10:30:00'),
('car_002', 'cust_001', 'SUV', 'Ford Explorer', 2019, 'أسود', 'XYZ 789', 'لها خدش خفيف', '2024-01-01 10:35:00'),
('car_003', 'cust_002', 'Sedan', 'Honda Accord', 2021, 'فضي', 'DEF 456', '', '2024-01-02 11:30:00'),
('car_004', 'cust_002', 'Sedan', 'Hyundai Elantra', 2018, 'أزرق', 'GHI 789', '', '2024-01-02 11:35:00'),
('car_005', 'cust_003', 'SUV', 'Toyota Land Cruiser', 2020, 'أبيض', 'JKL 012', '', '2024-01-03 12:30:00'),
('car_006', 'cust_004', 'Sedan', 'BMW 520', 2019, 'أسود', 'MNO 345', '', '2024-01-04 13:30:00'),
('car_007', 'cust_004', 'Sedan', 'Mercedes C200', 2021, 'فضي', 'PQR 678', '', '2024-01-04 13:35:00'),
('car_008', 'cust_005', 'SUV', 'Lexus RX350', 2020, 'أبيض', 'STU 901', '', '2024-01-05 14:30:00');

-- Insert subscriptions
INSERT OR IGNORE INTO subscriptions (id, customer_id, package_id, total_washes, used_washes, start_date, end_date, status, created_at, updated_at) VALUES
('sub_001', 'cust_001', 'pkg_basic', 10, 3, '2024-01-01', '2024-01-31', 'active', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('sub_002', 'cust_002', 'pkg_premium', 15, 5, '2024-01-02', '2024-02-02', 'active', '2024-01-02 11:00:00', '2024-01-02 11:00:00'),
('sub_003', 'cust_003', 'pkg_basic', 10, 2, '2024-01-03', '2024-02-03', 'active', '2024-01-03 12:00:00', '2024-01-03 12:00:00'),
('sub_004', 'cust_004', 'pkg_family', 20, 8, '2024-01-04', '2024-02-04', 'active', '2024-01-04 13:00:00', '2024-01-04 13:00:00'),
('sub_005', 'cust_005', 'pkg_premium', 15, 1, '2024-01-05', '2024-02-05', 'active', '2024-01-05 14:00:00', '2024-01-05 14:00:00');

-- Insert wash distribution
INSERT OR IGNORE INTO wash_distribution (id, subscription_id, car_id, allocated_washes, used_washes, created_at, updated_at) VALUES
('wd_001', 'sub_001', 'car_001', 6, 2, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('wd_002', 'sub_001', 'car_002', 4, 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('wd_003', 'sub_002', 'car_003', 8, 3, '2024-01-02 11:00:00', '2024-01-02 11:00:00'),
('wd_004', 'sub_002', 'car_004', 7, 2, '2024-01-02 11:00:00', '2024-01-02 11:00:00'),
('wd_005', 'sub_003', 'car_005', 10, 2, '2024-01-03 12:00:00', '2024-01-03 12:00:00'),
('wd_006', 'sub_004', 'car_006', 10, 4, '2024-01-04 13:00:00', '2024-01-04 13:00:00'),
('wd_007', 'sub_004', 'car_007', 10, 4, '2024-01-04 13:00:00', '2024-01-04 13:00:00'),
('wd_008', 'sub_005', 'car_008', 15, 1, '2024-01-05 14:00:00', '2024-01-05 14:00:00');

-- Insert employees
INSERT OR IGNORE INTO employees (id, name, phone, email, role, password_hash, status, working_hours, created_at, updated_at) VALUES
('emp_001', 'محمد أحمد', '+966511111111', 'mohammed.emp@example.com', 'employee', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', '{"mon": {"start": "06:00", "end": "19:00"}, "tue": {"start": "06:00", "end": "19:00"}}', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
('emp_002', 'خالد علي', '+966522222222', 'khaled.emp@example.com', 'employee', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', '{"mon": {"start": "06:00", "end": "19:00"}, "wed": {"start": "06:00", "end": "19:00"}}', '2024-01-02 09:00:00', '2024-01-02 09:00:00'),
('emp_003', 'عبدالله سعيد', '+966533333333', 'abdullah.emp@example.com', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', '{"mon": {"start": "06:00", "end": "19:00"}, "tue": {"start": "06:00", "end": "19:00"}, "wed": {"start": "06:00", "end": "19:00"}}', '2024-01-03 09:00:00', '2024-01-03 09:00:00');

-- Insert appointments
INSERT OR IGNORE INTO appointments (id, customer_id, car_id, service_id, employee_id, appointment_date, appointment_time, duration_minutes, location, latitude, longitude, status, is_subscription, notes, created_at, updated_at) VALUES
('apt_001', 'cust_001', 'car_001', 'svc_basic', 'emp_001', '2024-01-19', '08:00', 20, 'حي الملز، شارع الملك عبدالعزيز', 24.6541, 46.7154, 'scheduled', TRUE, 'موعد اشتراك', '2024-01-18 10:00:00', '2024-01-18 10:00:00'),
('apt_002', 'cust_002', 'car_003', 'svc_basic', 'emp_002', '2024-01-19', '09:00', 20, 'حي العليا، شارع العليا', 24.7136, 46.6753, 'scheduled', TRUE, 'موعد اشتراك', '2024-01-18 11:00:00', '2024-01-18 11:00:00'),
('apt_003', 'cust_003', 'car_005', 'svc_basic', 'emp_001', '2024-01-19', '10:00', 20, 'حي السليمانية، شارع السليمانية', 24.6967, 46.6771, 'scheduled', TRUE, 'موعد اشتراك', '2024-01-18 12:00:00', '2024-01-18 12:00:00'),
('apt_004', 'cust_004', 'car_006', 'svc_detailed', 'emp_002', '2024-01-19', '11:00', 45, 'حي النهضة، شارع النهضة', 24.7433, 46.6525, 'scheduled', FALSE, 'خدمة فردية', '2024-01-18 13:00:00', '2024-01-18 13:00:00'),
('apt_005', 'cust_005', 'car_008', 'svc_basic', 'emp_003', '2024-01-19', '14:00', 20, 'حي الروضة، شارع الروضة', 24.6694, 46.7025, 'scheduled', TRUE, 'موعد اشتراك', '2024-01-18 14:00:00', '2024-01-18 14:00:00');

-- Insert payments
INSERT OR IGNORE INTO payments (id, customer_id, appointment_id, amount, currency, payment_method, status, created_at, updated_at) VALUES
('pay_001', 'cust_001', NULL, 500.00, 'SAR', 'credit_card', 'completed', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('pay_002', 'cust_002', NULL, 700.00, 'SAR', 'apple_pay', 'completed', '2024-01-02 11:00:00', '2024-01-02 11:00:00'),
('pay_003', 'cust_003', NULL, 500.00, 'SAR', 'cash', 'completed', '2024-01-03 12:00:00', '2024-01-03 12:00:00'),
('pay_004', 'cust_004', 'apt_004', 80.00, 'SAR', 'google_pay', 'completed', '2024-01-04 13:00:00', '2024-01-04 13:00:00'),
('pay_005', 'cust_005', NULL, 700.00, 'SAR', 'stc_pay', 'completed', '2024-01-05 14:00:00', '2024-01-05 14:00:00');

-- Insert loyalty points
INSERT OR IGNORE INTO loyalty_points (id, customer_id, points_balance, total_earned, total_redeemed, tier_level, created_at, updated_at) VALUES
('lp_001', 'cust_001', 50, 50, 0, 'bronze', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('lp_002', 'cust_002', 70, 70, 0, 'bronze', '2024-01-02 11:00:00', '2024-01-02 11:00:00'),
('lp_003', 'cust_003', 50, 50, 0, 'bronze', '2024-01-03 12:00:00', '2024-01-03 12:00:00'),
('lp_004', 'cust_004', 80, 80, 0, 'bronze', '2024-01-04 13:00:00', '2024-01-04 13:00:00'),
('lp_005', 'cust_005', 70, 70, 0, 'bronze', '2024-01-05 14:00:00', '2024-01-05 14:00:00');

-- Insert ratings
INSERT OR IGNORE INTO ratings (id, appointment_id, customer_id, rating, comment, created_at, updated_at) VALUES
('rate_001', 'apt_001', 'cust_001', 5, 'خدمة ممتازة، الموظف كان محترفاً', '2024-01-19 08:30:00', '2024-01-19 08:30:00'),
('rate_002', 'apt_002', 'cust_002', 4, 'جيد جداً، لكن يمكن تحسين الوقت', '2024-01-19 09:30:00', '2024-01-19 09:30:00'),
('rate_003', 'apt_003', 'cust_003', 5, 'خدمة رائعة وسريعة', '2024-01-19 10:30:00', '2024-01-19 10:30:00');

-- Insert scheduling patterns
INSERT OR IGNORE INTO subscription_scheduling_patterns (id, subscription_id, pattern_type, interval_days, preferred_time_slot, cluster_id, auto_schedule, created_at, updated_at) VALUES
('sp_001', 'sub_001', 'regular', 3, 'morning', 'cluster_olaya', TRUE, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('sp_002', 'sub_002', 'regular', 3, 'evening', 'cluster_malaz', TRUE, '2024-01-02 11:00:00', '2024-01-02 11:00:00'),
('sp_003', 'sub_003', 'regular', 3, 'morning', 'cluster_sulaimania', TRUE, '2024-01-03 12:00:00', '2024-01-03 12:00:00'),
('sp_004', 'sub_004', 'regular', 3, 'evening', 'cluster_nahda', TRUE, '2024-01-04 13:00:00', '2024-01-04 13:00:00'),
('sp_005', 'sub_005', 'regular', 3, 'morning', 'cluster_rawdah', TRUE, '2024-01-05 14:00:00', '2024-01-05 14:00:00');

-- Insert business metrics
INSERT OR IGNORE INTO business_metrics (id, metric_date, metric_type, total_appointments, completed_appointments, cancelled_appointments, total_revenue, new_customers, returning_customers, average_rating, total_ratings, created_at, updated_at) VALUES
('bm_001', '2024-01-19', 'daily', 5, 3, 0, 930.00, 0, 5, 4.7, 3, '2024-01-19 23:59:59', '2024-01-19 23:59:59');