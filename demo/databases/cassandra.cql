-- Create keyspace
CREATE KEYSPACE IF NOT EXISTS llana
WITH REPLICATION = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};

USE llana;

-- User table
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY,
  email TEXT,
  password TEXT,
  role TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Create secondary index on email for uniqueness checks
CREATE INDEX IF NOT EXISTS user_email_idx ON "User" (email);

-- Insert demo user
INSERT INTO "User" (id, email, password, role, "firstName", "lastName", "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), 'test@test.com', '$2a$10$jm6bM7acpRa18Vdy8FSqIu4yzWAdSgZgRtRrx8zknIeZhSqPJjJU.', 'ADMIN', 'Jon', 'Doe', '2000-01-01 00:00:01', '2000-01-01 00:00:00', null);

-- UserApiKey table
CREATE TABLE IF NOT EXISTS "UserApiKey" (
  id UUID PRIMARY KEY,
  "userId" UUID,
  "apiKey" TEXT,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Create secondary index on userId for lookups
CREATE INDEX IF NOT EXISTS user_api_key_user_id_idx ON "UserApiKey" ("userId");

-- Insert demo API key (we'll use a fixed UUID for the user reference)
INSERT INTO "UserApiKey" (id, "userId", "apiKey", "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'Ex@mp1eS$Cu7eAp!K3y', '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);

-- Customer table
CREATE TABLE IF NOT EXISTS "Customer" (
  "custId" UUID PRIMARY KEY,
  "userId" UUID,
  "companyName" TEXT,
  "contactName" TEXT,
  "contactTitle" TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  "postalCode" TEXT,
  country TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  fax TEXT,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Create secondary index on userId for lookups
CREATE INDEX IF NOT EXISTS customer_user_id_idx ON "Customer" ("userId");

-- Insert demo customers
INSERT INTO "Customer" ("custId", "userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, mobile, email, fax, "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'Alfreds Futterkiste', 'Maria Anders', 'Sales Representative', 'Obere Str. 57', 'Berlin', null, '12209', 'Germany', '030-0074321', null, 'maria@alfreds.com', '030-0076545', '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);

INSERT INTO "Customer" ("custId", "userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, mobile, email, fax, "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'Ana Trujillo Emparedados y helados', 'Ana Trujillo', 'Owner', 'Avda. de la Constitución 2222', 'México D.F.', null, '05021', 'Mexico', '(5) 555-4729', null, 'ana@trujillo.com', '(5) 555-3745', '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);

INSERT INTO "Customer" ("custId", "userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, mobile, email, fax, "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'Antonio Moreno Taquería', 'Antonio Moreno', 'Owner', 'Mataderos 2312', 'México D.F.', null, '05023', 'Mexico', '(5) 555-3932', null, 'antonio@moreno.com', null, '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);

-- Employee table
CREATE TABLE IF NOT EXISTS "Employee" (
  "empId" UUID PRIMARY KEY,
  "userId" UUID,
  "lastName" TEXT,
  "firstName" TEXT,
  title TEXT,
  "titleOfCourtesy" TEXT,
  "birthDate" DATE,
  "hireDate" DATE,
  address TEXT,
  city TEXT,
  region TEXT,
  "postalCode" TEXT,
  country TEXT,
  "homePhone" TEXT,
  extension TEXT,
  notes TEXT,
  "reportsTo" UUID,
  "photoPath" TEXT,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Create secondary indexes for lookups
CREATE INDEX IF NOT EXISTS employee_user_id_idx ON "Employee" ("userId");
CREATE INDEX IF NOT EXISTS employee_reports_to_idx ON "Employee" ("reportsTo");

-- Insert demo employees
INSERT INTO "Employee" ("empId", "userId", "lastName", "firstName", title, "titleOfCourtesy", "birthDate", "hireDate", address, city, region, "postalCode", country, "homePhone", extension, notes, "reportsTo", "photoPath", "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'Davolio', 'Nancy', 'Sales Representative', 'Ms.', '1948-12-08', '1992-05-01', '507 - 20th Ave. E. Apt. 2A', 'Seattle', 'WA', '98122', 'USA', '(206) 555-9857', '5467', 'Education includes a BA in psychology from Colorado State University in 1970.', null, 'http://accweb/emmployees/davolio.bmp', '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);

INSERT INTO "Employee" ("empId", "userId", "lastName", "firstName", title, "titleOfCourtesy", "birthDate", "hireDate", address, city, region, "postalCode", country, "homePhone", extension, notes, "reportsTo", "photoPath", "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'Fuller', 'Andrew', 'Vice President, Sales', 'Dr.', '1952-02-19', '1992-08-14', '908 W. Capital Way', 'Tacoma', 'WA', '98401', 'USA', '(206) 555-9482', '3457', 'Andrew received his BTS commercial in 1974 and a Ph.D. in international marketing from the University of Dallas in 1981.', null, 'http://accweb/emmployees/fuller.bmp', '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);

-- Shipper table
CREATE TABLE IF NOT EXISTS "Shipper" (
  "shipperId" UUID PRIMARY KEY,
  "userId" UUID,
  "companyName" TEXT,
  phone TEXT,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Create secondary index on userId for lookups
CREATE INDEX IF NOT EXISTS shipper_user_id_idx ON "Shipper" ("userId");

-- Insert demo shippers
INSERT INTO "Shipper" ("shipperId", "userId", "companyName", phone, "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'Speedy Express', '(503) 555-9831', '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);

INSERT INTO "Shipper" ("shipperId", "userId", "companyName", phone, "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'United Package', '(503) 555-3199', '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);

INSERT INTO "Shipper" ("shipperId", "userId", "companyName", phone, "createdAt", "updatedAt", "deletedAt")
VALUES (uuid(), uuid(), 'Federal Shipping', '(503) 555-9931', '2000-01-01 00:00:00', '2000-01-01 00:00:00', null);
