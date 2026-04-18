CREATE TABLE plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration_days INT NULL, -- NULL for lifetime
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  feature_key VARCHAR(50) NOT NULL,
  value VARCHAR(100) NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id VARCHAR(50) NOT NULL, -- Handle UUIDs or INTs
  plan_id INT NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NULL, -- NULL for lifetime
  status ENUM('active', 'expired', 'trial') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Seed Initial Plans
INSERT INTO plans (id, name, price, duration_days, is_active) VALUES
(1, 'Freemium', 0.00, 36500, TRUE), -- Treated as effectively permanent, but feature limited
(2, 'Monthly Pro', 29.99, 30, TRUE),
(3, 'Semi-Annual Pro', 149.99, 180, TRUE),
(4, 'Yearly Pro', 249.99, 365, TRUE),
(5, 'Lifetime', 999.99, NULL, TRUE);

-- Seed Freemium Features
INSERT INTO plan_features (plan_id, feature_key, value) VALUES
(1, 'bill_history_days', '1'),
(1, 'exports_enabled', 'false'),
(1, 'max_bills_per_day', '120'),
(1, 'max_items', '200'),
(1, 'salesman_enabled', 'false'),
(1, 'support_type', 'none');

-- Seed Monthly Pro Features (and similarly for others)
INSERT INTO plan_features (plan_id, feature_key, value) VALUES
(2, 'bill_history_days', '-1'), -- -1 for unlimited
(2, 'exports_enabled', 'true'),
(2, 'max_bills_per_day', '-1'),
(2, 'max_items', '-1'),
(2, 'salesman_enabled', 'true'),
(2, 'support_type', 'priority');

INSERT INTO plan_features (plan_id, feature_key, value) VALUES
(3, 'bill_history_days', '-1'),
(3, 'exports_enabled', 'true'),
(3, 'max_bills_per_day', '-1'),
(3, 'max_items', '-1'),
(3, 'salesman_enabled', 'true'),
(3, 'support_type', 'priority');

INSERT INTO plan_features (plan_id, feature_key, value) VALUES
(4, 'bill_history_days', '-1'),
(4, 'exports_enabled', 'true'),
(4, 'max_bills_per_day', '-1'),
(4, 'max_items', '-1'),
(4, 'salesman_enabled', 'true'),
(4, 'support_type', 'priority');

INSERT INTO plan_features (plan_id, feature_key, value) VALUES
(5, 'bill_history_days', '-1'),
(5, 'exports_enabled', 'true'),
(5, 'max_bills_per_day', '-1'),
(5, 'max_items', '-1'),
(5, 'salesman_enabled', 'true'),
(5, 'support_type', 'priority');
