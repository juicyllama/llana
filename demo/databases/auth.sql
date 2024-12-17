USE llana;

DROP TABLE IF EXISTS `_llana_auth`;

CREATE TABLE IF NOT EXISTS `_llana_auth` (
  `id` int NOT NULL AUTO_INCREMENT,
  `table` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `rule` JSON NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `table_type` (`table`, `type`),
  KEY `auth_type` (`auth`, `type`)
) ENGINE=InnoDB;

-- Insert EXCLUDE rule for Employee table to allow public READ access
INSERT INTO `_llana_auth` (`table`, `auth`, `type`, `rule`)
VALUES ('Employee', 'APIKEY', 'EXCLUDE', JSON_OBJECT(
  'access', 'READ',
  'enabled', true,
  'public_records', 'READ'
));

-- Insert EXCLUDE rule for SalesOrder table to allow public READ access
INSERT INTO `_llana_auth` (`table`, `auth`, `type`, `rule`)
VALUES ('SalesOrder', 'APIKEY', 'EXCLUDE', JSON_OBJECT(
  'access', 'READ',
  'enabled', true,
  'public_records', 'READ'
));
