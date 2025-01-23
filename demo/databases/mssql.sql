CREATE DATABASE llana;

USE llana;

CREATE TABLE [User] (
  id int NOT NULL IDENTITY
  ,email varchar(255) NOT NULL
  ,password varchar(255) NOT NULL
  ,role varchar(30) check (role in ('ADMIN','USER')) DEFAULT 'USER'
  ,firstName varchar(255) DEFAULT NULL
  ,lastName varchar(255) DEFAULT NULL
  ,createdAt datetime2(0) DEFAULT GETDATE()
  ,updatedAt datetime2(0) DEFAULT GETDATE() /* ON UPDATE GETDATE() */
  ,deletedAt datetime2(0) DEFAULT NULL
  ,PRIMARY KEY (id)
  ,CONSTRAINT id UNIQUE (id)
  ,CONSTRAINT uniqueEmail UNIQUE (email)
) ;

SET IDENTITY_INSERT [User] ON;

INSERT INTO [User] (id, email, password, role, firstName, lastName, createdAt, updatedAt, deletedAt) VALUES (1, 'test@test.com', '$2a$10$jm6bM7acpRa18Vdy8FSqIu4yzWAdSgZgRtRrx8zknIeZhSqPJjJU.', 'ADMIN', 'Jon', 'Doe', '2000-01-01 00:00:01', '2000-01-01 00:00:00', NULL);

SET IDENTITY_INSERT [User] OFF;


CREATE TABLE UserApiKey (
  id int NOT NULL IDENTITY
  ,userId int NOT NULL
  ,apiKey varchar(255) NOT NULL
  ,createdAt datetime2(0) DEFAULT GETDATE()
  ,updatedAt datetime2(0) DEFAULT GETDATE() /* ON UPDATE GETDATE() */
  ,deletedAt datetime2(0) DEFAULT NULL
  ,PRIMARY KEY (id)
  ,CONSTRAINT UserApiKeyUserId FOREIGN KEY (userId) REFERENCES [User] (id) ON DELETE CASCADE ON UPDATE NO ACTION
) ;

CREATE INDEX [user] ON UserApiKey (userId);

SET IDENTITY_INSERT UserApiKey ON;

INSERT INTO UserApiKey (id, userId, apiKey, createdAt, updatedAt, deletedAt) VALUES (1, 1, 'Ex@mp1eS$Cu7eAp!K3y', '2000-01-01 00:00:00', '2000-01-01 00:00:00', NULL);

SET IDENTITY_INSERT UserApiKey OFF;


CREATE TABLE Customer (
  custId INT IDENTITY NOT NULL
  ,userId int NOT NULL
  ,companyName VARCHAR(40) NOT NULL
  ,contactName VARCHAR(60) NULL
  ,contactTitle VARCHAR(30) NULL
  ,address VARCHAR(60) NULL
  ,city VARCHAR(15) NULL
  ,region VARCHAR(15) NULL
  ,postalCode VARCHAR(10) NULL
  ,country VARCHAR(15) NULL
  ,phone VARCHAR(24) NULL
  ,mobile VARCHAR(24) NULL
  ,email VARCHAR(225) NULL
  ,fax VARCHAR(24) NULL
  ,createdAt datetime2(0) DEFAULT GETDATE()
  ,updatedAt datetime2(0) DEFAULT GETDATE() /* ON UPDATE GETDATE() */
  ,deletedAt datetime2(0) DEFAULT NULL
  ,PRIMARY KEY (custId)
  ,CONSTRAINT CustomerUserId FOREIGN KEY (userId) REFERENCES [User] (id) ON DELETE CASCADE ON UPDATE NO ACTION
  ) ;

CREATE TABLE Employee (
  employeeId INT IDENTITY NOT NULL
  ,lastName VARCHAR(20) NOT NULL
  ,firstName VARCHAR(10) NOT NULL
  ,title VARCHAR(30) NULL
  ,titleOfCourtesy VARCHAR(25) NULL
  ,birthDate DATETIME2(0) NULL
  ,hireDate DATETIME2(0) NULL
  ,address VARCHAR(60) NULL
  ,city VARCHAR(15) NULL
  ,region VARCHAR(15) NULL
  ,postalCode VARCHAR(10) NULL
  ,country VARCHAR(15) NULL
  ,phone VARCHAR(24) NULL
  ,extension VARCHAR(4) NULL
  ,mobile VARCHAR(24) NULL
  ,email VARCHAR(225) NULL
  ,photo VARBINARY(max) NULL
  ,notes VARBINARY(max) NULL
  ,mgrId INT NULL
  ,photoPath VARCHAR(255) NULL
  ,createdAt datetime2(0) DEFAULT GETDATE()
  ,updatedAt datetime2(0) DEFAULT GETDATE() /* ON UPDATE GETDATE() */
  ,deletedAt datetime2(0) DEFAULT NULL
  ,PRIMARY KEY (employeeId)
  ) ;



CREATE TABLE Shipper (
  shipperId INT IDENTITY NOT NULL
  ,companyName VARCHAR(40) NOT NULL
  ,phone VARCHAR(44) NULL
  ,createdAt datetime2(0) DEFAULT GETDATE()
  ,updatedAt datetime2(0) DEFAULT GETDATE() /* ON UPDATE GETDATE() */
  ,deletedAt datetime2(0) DEFAULT NULL
  ,PRIMARY KEY (ShipperId)
  ) ;


CREATE TABLE SalesOrder (
  orderId INT IDENTITY NOT NULL
  ,custId INT NOT NULL
  ,employeeId INT NULL
  ,orderDate DATETIME2(0) NULL
  ,requiredDate DATETIME2(0) NULL
  ,shippedDate DATETIME2(0) NULL
  ,shipperId INT NOT NULL
  ,freight DECIMAL(10, 2) NULL
  ,shipName VARCHAR(40) NULL
  ,shipAddress VARCHAR(60) NULL
  ,shipCity VARCHAR(15) NULL
  ,shipRegion VARCHAR(15) NULL
  ,shipPostalCode VARCHAR(10) NULL
  ,shipCountry VARCHAR(15) NULL
  ,createdAt datetime2(0) DEFAULT GETDATE()
  ,updatedAt datetime2(0) DEFAULT GETDATE() /* ON UPDATE GETDATE() */
  ,deletedAt datetime2(0) DEFAULT NULL
  ,PRIMARY KEY (orderId)
   , FOREIGN KEY (shipperId)
      REFERENCES Shipper(shipperId)
   ,FOREIGN KEY (custId)
      REFERENCES Customer(custId) 

  ) ;


SET IDENTITY_INSERT Employee ON;

INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(1, N'Davis', N'Sara', N'CEO', N'Ms.', '1958-12-08 00:00:00.000', '2002-05-01 00:00:00.000', N'7890 - 20th Ave. E., Apt. 2A', N'Seattle', N'WA', N'10003', N'USA', N'(206) 555-0101', NULL);
INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(2, N'Funk', N'Don', N'Vice President, Sales', N'Dr.', '1962-02-19 00:00:00.000', '2002-08-14 00:00:00.000', N'9012 W. Capital Way', N'Tacoma', N'WA', N'10001', N'USA', N'(206) 555-0100', 1);
INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(3, N'Lew', N'Judy', N'Sales Manager', N'Ms.', '1973-08-30 00:00:00.000', '2002-04-01 00:00:00.000', N'2345 Moss Bay Blvd.', N'Kirkland', N'WA', N'10007', N'USA', N'(206) 555-0103', 2);
INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(4, N'Peled', N'Yael', N'Sales Representative', N'Mrs.', '1947-09-19 00:00:00.000', '2003-05-03 00:00:00.000', N'5678 Old Redmond Rd.', N'Redmond', N'WA', N'10009', N'USA', N'(206) 555-0104', 3);
INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(5, N'Buck', N'Sven', N'Sales Manager', N'Mr.', '1965-03-04 00:00:00.000', '2003-10-17 00:00:00.000', N'8901 Garrett Hill', N'London', NULL, N'10004', N'UK', N'(71) 234-5678', 2);
INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(6, N'Suurs', N'Paul', N'Sales Representative', N'Mr.', '1973-07-02 00:00:00.000', '2003-10-17 00:00:00.000', N'3456 Coventry House, Miner Rd.', N'London', NULL, N'10005', N'UK', N'(71) 345-6789', 5);
INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(7, N'King', N'Russell', N'Sales Representative', N'Mr.', '1970-05-29 00:00:00.000', '2004-01-02 00:00:00.000', N'6789 Edgeham Hollow, Winchester Way', N'London', NULL, N'10002', N'UK', N'(71) 123-4567', 5);
INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(8, N'Cameron', N'Maria', N'Sales Representative', N'Ms.', '1968-01-09 00:00:00.000', '2004-03-05 00:00:00.000', N'4567 - 11th Ave. N.E.', N'Seattle', N'WA', N'10006', N'USA', N'(206) 555-0102', 3);
INSERT  INTO Employee(employeeId, lastName, firstName, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalCode, country, phone, mgrid)
  VALUES(9, N'Dolgopyatova', N'Zoya', N'Sales Representative', N'Ms.', '1976-01-27 00:00:00.000', '2004-11-15 00:00:00.000', N'1234 Houndstooth Rd.', N'London', NULL, N'10008', N'UK', N'(71) 456-7890', 5);

SET IDENTITY_INSERT Employee OFF;


SET IDENTITY_INSERT Shipper ON;

INSERT  INTO Shipper(shipperId, companyName, phone)
  VALUES(1, N'Shipper GVSUA', N'(503) 555-0137');
INSERT  INTO Shipper(shipperId, companyName, phone)
  VALUES(2, N'Shipper ETYNR', N'(425) 555-0136');
INSERT  INTO Shipper(shipperId, companyName, phone)
  VALUES(3, N'Shipper ZHISN', N'(415) 555-0138');

SET IDENTITY_INSERT Shipper OFF;

SET IDENTITY_INSERT Customer ON;


INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(1, 1, N'Customer NRZBB', N'Allen, Michael', N'Sales Representative', N'Obere Str. 0123', N'Berlin', NULL, N'10092', N'Germany', N'030-3456789', N'030-0123456');
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(2, 1, N'Customer MLTDN', N'Hassall, Mark', N'Owner', N'Avda. de la Constitución 5678', N'México D.F.', NULL, N'10077', N'Mexico', N'(5) 789-0123', N'(5) 456-7890');
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(3, 1, N'Customer KBUDE', N'Peoples, John', N'Owner', N'Mataderos  7890', N'México D.F.', NULL, N'10097', N'Mexico', N'(5) 123-4567', NULL);
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(4, 1, N'Customer HFBZG', N'Arndt, Torsten', N'Sales Representative', N'7890 Hanover Sq.', N'London', NULL, N'10046', N'UK', N'(171) 456-7890', N'(171) 456-7891');
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(5, 1, N'Customer HGVLZ', N'Higginbotham, Tom', N'Order Administrator', N'Berguvsvägen  5678', N'Luleå', NULL, N'10112', N'Sweden', N'0921-67 89 01', N'0921-23 45 67');
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(6, 1, N'Customer XHXJV', N'Poland, Carole', N'Sales Representative', N'Forsterstr. 7890', N'Mannheim', NULL, N'10117', N'Germany', N'0621-67890', N'0621-12345');
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(7, 1, N'Customer QXVLA', N'Bansal, Dushyant', N'Marketing Manager', N'2345, place Kléber', N'Strasbourg', NULL, N'10089', N'France', N'67.89.01.23', N'67.89.01.24');
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(8, 1, N'Customer QUHWH', N'Ilyina, Julia', N'Owner', N'C/ Araquil, 0123', N'Madrid', NULL, N'10104', N'Spain', N'(91) 345 67 89', N'(91) 012 34 56');
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(9, 1, N'Customer RTXGC', N'Raghav, Amritansh', N'Owner', N'6789, rue des Bouchers', N'Marseille', NULL, N'10105', N'France', N'23.45.67.89', N'23.45.67.80');
INSERT  INTO Customer(custId, userId, companyName, contactName, contactTitle, address, city, region, postalCode, country, phone, fax)
  VALUES(10, 1, N'Customer EEALV', N'Bassols, Pilar Colome', N'Accounting Manager', N'8901 Tsawassen Blvd.', N'Tsawassen', N'BC', N'10111', N'Canada', N'(604) 901-2345', N'(604) 678-9012');

SET IDENTITY_INSERT Customer OFF;


SET IDENTITY_INSERT SalesOrder ON;

INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(1, 1, 5, '2006-07-04 00:00:00.000', '2006-08-01 00:00:00.000', '2006-07-16 00:00:00.000', 3, 32.38, N'Ship to 85-B', N'6789 rue de l''Abbaye', N'Reims', NULL, N'10345', N'France');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(2, 2, 6, '2006-07-05 00:00:00.000', '2006-08-16 00:00:00.000', '2006-07-10 00:00:00.000', 1, 11.61, N'Ship to 79-C', N'Luisenstr. 9012', N'Münster', NULL, N'10328', N'Germany');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(3, 3, 4, '2006-07-08 00:00:00.000', '2006-08-05 00:00:00.000', '2006-07-12 00:00:00.000', 2, 65.83, N'Destination SCQXA', N'Rua do Paço, 7890', N'Rio de Janeiro', N'RJ', N'10195', N'Brazil');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(4, 4, 3, '2006-07-08 00:00:00.000', '2006-08-05 00:00:00.000', '2006-07-15 00:00:00.000', 1, 41.34, N'Ship to 84-A', N'3456, rue du Commerce', N'Lyon', NULL, N'10342', N'France');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(5, 5, 4, '2006-07-09 00:00:00.000', '2006-08-06 00:00:00.000', '2006-07-11 00:00:00.000', 2, 51.30, N'Ship to 76-B', N'Boulevard Tirou, 9012', N'Charleroi', NULL, N'10318', N'Belgium');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(6, 6, 3, '2006-07-10 00:00:00.000', '2006-07-24 00:00:00.000', '2006-07-16 00:00:00.000', 2, 58.17, N'Destination JPAIY', N'Rua do Paço, 8901', N'Rio de Janeiro', N'RJ', N'10196', N'Brazil');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(7, 7, 5, '2006-07-11 00:00:00.000', '2006-08-08 00:00:00.000', '2006-07-23 00:00:00.000', 2, 22.98, N'Destination YUJRD', N'Hauptstr. 1234', N'Bern', NULL, N'10139', N'Switzerland');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(8, 8, 9, '2006-07-12 00:00:00.000', '2006-08-09 00:00:00.000', '2006-07-15 00:00:00.000', 3, 148.33, N'Ship to 68-A', N'Starenweg 6789', N'Genève', NULL, N'10294', N'Switzerland');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(9, 9, 3, '2006-07-15 00:00:00.000', '2006-08-12 00:00:00.000', '2006-07-17 00:00:00.000', 2, 13.97, N'Ship to 88-B', N'Rua do Mercado, 5678', N'Resende', N'SP', N'10354', N'Brazil');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(10, 10, 4, '2006-07-16 00:00:00.000', '2006-08-13 00:00:00.000', '2006-07-22 00:00:00.000', 3, 81.91, N'Destination JYDLM', N'Carrera1234 con Ave. Carlos Soublette #8-35', N'San Cristóbal', N'Táchira', N'10199', N'Venezuela');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(11, 1, 1, '2006-07-17 00:00:00.000', '2006-08-14 00:00:00.000', '2006-07-23 00:00:00.000', 1, 140.51, N'Destination RVDMF', N'Kirchgasse 9012', N'Graz', NULL, N'10157', N'Austria');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(12, 2, 4, '2006-07-18 00:00:00.000', '2006-08-15 00:00:00.000', '2006-07-25 00:00:00.000', 3, 3.25, N'Destination LGGCH', N'Sierras de Granada 9012', N'México D.F.', NULL, N'10137', N'Mexico');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(13, 3, 4, '2006-07-19 00:00:00.000', '2006-08-16 00:00:00.000', '2006-07-29 00:00:00.000', 1, 55.09, N'Ship to 56-A', N'Mehrheimerstr. 0123', N'Köln', NULL, N'10258', N'Germany');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(14, 4, 4, '2006-07-19 00:00:00.000', '2006-08-16 00:00:00.000', '2006-07-30 00:00:00.000', 2, 3.05, N'Ship to 61-B', N'Rua da Panificadora, 6789', N'Rio de Janeiro', N'RJ', N'10274', N'Brazil');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(15, 5, 8, '2006-07-22 00:00:00.000', '2006-08-19 00:00:00.000', '2006-07-25 00:00:00.000', 3, 48.29, N'Ship to 65-B', N'8901 Milton Dr.', N'Albuquerque', N'NM', N'10286', N'USA');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(16, 6, 9, '2006-07-23 00:00:00.000', '2006-08-20 00:00:00.000', '2006-07-31 00:00:00.000', 3, 146.06, N'Destination FFXKT', N'Kirchgasse 0123', N'Graz', NULL, N'10158', N'Austria');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(17, 7, 6, '2006-07-24 00:00:00.000', '2006-08-21 00:00:00.000', '2006-08-23 00:00:00.000', 3, 3.67, N'Destination KBSBN', N'Åkergatan 9012', N'Bräcke', NULL, N'10167', N'Sweden');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(18, 8, 2, '2006-07-25 00:00:00.000', '2006-08-22 00:00:00.000', '2006-08-12 00:00:00.000', 1, 55.28, N'Ship to 7-A', N'0123, place Kléber', N'Strasbourg', NULL, N'10329', N'France');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(19, 9, 3, '2006-07-26 00:00:00.000', '2006-09-06 00:00:00.000', '2006-07-31 00:00:00.000', 3, 25.73, N'Ship to 87-B', N'Torikatu 2345', N'Oulu', NULL, N'10351', N'Finland');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(20, 10, 4, '2006-07-29 00:00:00.000', '2006-08-26 00:00:00.000', '2006-08-06 00:00:00.000', 1, 208.58, N'Destination VAPXU', N'Berliner Platz 0123', N'München', NULL, N'10168', N'Germany');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(21, 1, 8, '2006-07-30 00:00:00.000', '2006-08-27 00:00:00.000', '2006-08-02 00:00:00.000', 3, 66.29, N'Destination QJVQH', N'5ª Ave. Los Palos Grandes 5678', N'Caracas', N'DF', N'10193', N'Venezuela');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(22, 2, 5, '2006-07-31 00:00:00.000', '2006-08-14 00:00:00.000', '2006-08-09 00:00:00.000', 1, 4.56, N'Ship to 89-B', N'8901 - 12th Ave. S.', N'Seattle', N'WA', N'10357', N'USA');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(23, 3, 1, '2006-08-01 00:00:00.000', '2006-08-29 00:00:00.000', '2006-08-02 00:00:00.000', 1, 136.54, N'Ship to 87-B', N'Torikatu 2345', N'Oulu', NULL, N'10351', N'Finland');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(24, 4, 6, '2006-08-01 00:00:00.000', '2006-08-29 00:00:00.000', '2006-08-30 00:00:00.000', 2, 4.54, N'Ship to 75-C', N'P.O. Box 7890', N'Lander', N'WY', N'10316', N'USA');
INSERT  INTO SalesOrder(orderId, custId, employeeId, orderDate, requiredDate, shippedDate, shipperId, freight, shipName, shipAddress, shipCity, shipRegion, shipPostalCode, shipCountry)
  VALUES(25, 5, 6, '2006-08-02 00:00:00.000', '2006-08-30 00:00:00.000', '2006-08-06 00:00:00.000', 2, 98.03, N'Ship to 65-A', N'7890 Milton Dr.', N'Albuquerque', N'NM', N'10285', N'USA');

SET IDENTITY_INSERT SalesOrder OFF;
