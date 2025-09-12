-- Passengers: add email and emergencyContacts if missing
ALTER TABLE `passengers` ADD COLUMN IF NOT EXISTS `email` VARCHAR(255) NULL UNIQUE;
ALTER TABLE `passengers` ADD COLUMN IF NOT EXISTS `emergency_contacts` TEXT NULL;
ALTER TABLE `passengers` ADD COLUMN IF NOT EXISTS `contract_id` VARCHAR(255) NULL;

-- Wallets: create table if not exists
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `driver_id` INT NOT NULL,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `payment_method` VARCHAR(255) NULL,
  CONSTRAINT `fk_wallets_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Drivers: add new document and compliance fields if missing
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `email` VARCHAR(255) NULL UNIQUE;
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `driving_license_file` VARCHAR(255) NULL;
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `document` VARCHAR(255) NULL;
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `national_id_file` VARCHAR(255) NULL;
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `vehicle_registration_file` VARCHAR(255) NULL;
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `insurance_file` VARCHAR(255) NULL;
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `insurance_expiry` DATETIME NULL;
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `emergency_contacts` TEXT NULL;
ALTER TABLE `drivers` ADD COLUMN IF NOT EXISTS `document_status` VARCHAR(50) NULL;


