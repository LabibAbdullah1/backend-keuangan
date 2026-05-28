-- SQL Database Schema for Keuangan (Personal Finance API)
-- You can import this script directly inside phpMyAdmin in cPanel or run it on your local MySQL server.

CREATE DATABASE IF NOT EXISTS `keuangan_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `keuangan_db`;

-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('income', 'expense') NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `date` DATE NOT NULL,
  `note` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_transactions_date` (`date`),
  INDEX `idx_transactions_type_date` (`type`, `date`),
  INDEX `idx_transactions_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Budgets Table (Supports Category Budgets per Month/Year)
CREATE TABLE IF NOT EXISTS `budgets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `month` INT NOT NULL CHECK (`month` BETWEEN 1 AND 12),
  `year` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_category_month_year` (`category`, `month`, `year`),
  INDEX `idx_budgets_lookup` (`category`, `month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Savings Goals Table (Supports Financial Target Tracking)
CREATE TABLE IF NOT EXISTS `savings_goals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `target_amount` DECIMAL(15, 2) NOT NULL CHECK (`target_amount` > 0),
  `current_amount` DECIMAL(15, 2) DEFAULT 0.00 CHECK (`current_amount` >= 0),
  `target_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_goals_date` (`target_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Recurring Templates Table (Supports Automated Subscriptions & Recurring Income)
CREATE TABLE IF NOT EXISTS `recurring_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('income', 'expense') NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL CHECK (`amount` > 0),
  `category` VARCHAR(100) NOT NULL,
  `frequency` ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
  `note` TEXT NULL,
  `next_due_date` DATE NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_recurring_due` (`is_active`, `next_due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
