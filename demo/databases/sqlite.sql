-- Sqlite SQL script 

PRAGMA encoding="UTF-8";


DROP TABLE IF EXISTS Customer;

CREATE TABLE Customer (
  entityId INTEGER PRIMARY KEY AUTOINCREMENT,
  companyName VARCHAR(40) NOT NULL,
  contactName VARCHAR(30) NULL,
  contactTitle VARCHAR(30) NULL,
  address VARCHAR(60) NULL,
  city VARCHAR(15) NULL,
  region VARCHAR(15) NULL,
  postalCode VARCHAR(10) NULL,
  country VARCHAR(15) NULL,
  phone VARCHAR(24) NULL,
  mobile VARCHAR(24) NULL,
  email VARCHAR(225) NULL,
  fax VARCHAR(24) NULL
  );


DROP TABLE IF EXISTS Employee;

CREATE TABLE Employee (
  entityId INTEGER PRIMARY KEY AUTOINCREMENT,
  lastname VARCHAR(20) NOT NULL,
  firstname VARCHAR(10) NOT NULL,
  title VARCHAR(30) NULL,
  titleOfCourtesy VARCHAR(25) NULL,
  birthDate DATETIME NULL,
  hireDate DATETIME NULL,
  address VARCHAR(60) NULL,
  city VARCHAR(15) NULL,
  region VARCHAR(15) NULL,
  postalCode VARCHAR(10) NULL,
  country VARCHAR(15) NULL,
  phone VARCHAR(24) NULL,
  extension VARCHAR(4) NULL,
  mobile VARCHAR(24) NULL,
  email VARCHAR(225) NULL,
  photo BLOB NULL,
  notes BLOB NULL,
  mgrId INT NULL,
  photoPath VARCHAR(255) NULL
  );


CREATE TABLE Shipper (
  entityId INTEGER PRIMARY KEY AUTOINCREMENT,
  companyName VARCHAR(40) NOT NULL,
  phone VARCHAR(44) NULL
  );




CREATE TABLE SalesOrder (
  entityId INTEGER PRIMARY KEY AUTOINCREMENT,
  customerId INT NOT NULL,
  employeeId INT NULL,
  orderDate DATETIME NULL,
  requiredDate DATETIME NULL,
  shippedDate DATETIME NULL,
  shipperId INT NOT NULL,
  freight DECIMAL(10, 2) NULL,
  shipName VARCHAR(40) NULL,
  shipAddress VARCHAR(60) NULL,
  shipCity VARCHAR(15) NULL,
  shipRegion VARCHAR(15) NULL,
  shipPostalCode VARCHAR(10) NULL,
  shipCountry VARCHAR(15) NULL,
  FOREIGN KEY (shipperId) REFERENCES Shipper(entityId),
  FOREIGN KEY (customerId) REFERENCES Customer(entityId) 

  );




-- Indexing & Foreign Key

CREATE UNIQUE INDEX IF NOT EXISTS IDX_CustomerId_CustomerTypeId ON CustomerCustomerDemographics (customerId, customerTypeId);

CREATE UNIQUE INDEX IF NOT EXISTS IDX_EmployeeId_TerritoryCode ON EmployeeTerritory (employeeId, territoryCode);

CREATE UNIQUE INDEX IF NOT EXISTS IDX_OrderId_ProductId ON OrderDetail (orderId, productId);



-- Populate Employess table

INSERT INTO Employee(entityId, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(1, 'Davis', 'Sara', 'CEO', 'Ms.', '1958-12-08 00:00:00.000', '2002-05-01 00:00:00.000', '7890 - 20th Ave. E., Apt. 2A', 'Seattle', 'WA', '10003', 'USA', '(206) 555-0101', NULL);
INSERT INTO Employee(entityid, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(2, 'Funk', 'Don', 'Vice President, Sales', 'Dr.', '1962-02-19 00:00:00.000', '2002-08-14 00:00:00.000', '9012 W. Capital Way', 'Tacoma', 'WA', '10001', 'USA', '(206) 555-0100', 1);
INSERT INTO Employee(entityid, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(3, 'Lew', 'Judy', 'Sales Manager', 'Ms.', '1973-08-30 00:00:00.000', '2002-04-01 00:00:00.000', '2345 Moss Bay Blvd.', 'Kirkland', 'WA', '10007', 'USA', '(206) 555-0103', 2);
INSERT INTO Employee(entityid, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(4, 'Peled', 'Yael', 'Sales Representative', 'Mrs.', '1947-09-19 00:00:00.000', '2003-05-03 00:00:00.000', '5678 Old Redmond Rd.', 'Redmond', 'WA', '10009', 'USA', '(206) 555-0104', 3);
INSERT INTO Employee(entityid, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(5, 'Buck', 'Sven', 'Sales Manager', 'Mr.', '1965-03-04 00:00:00.000', '2003-10-17 00:00:00.000', '8901 Garrett Hill', 'London', NULL, '10004', 'UK', '(71) 234-5678', 2);
INSERT INTO Employee(entityid, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(6, 'Suurs', 'Paul', 'Sales Representative', 'Mr.', '1973-07-02 00:00:00.000', '2003-10-17 00:00:00.000', '3456 Coventry House, Miner Rd.', 'London', NULL, '10005', 'UK', '(71) 345-6789', 5);
INSERT INTO Employee(entityid, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(7, 'King', 'Russell', 'Sales Representative', 'Mr.', '1970-05-29 00:00:00.000', '2004-01-02 00:00:00.000', '6789 Edgeham Hollow, Winchester Way', 'London', NULL, '10002', 'UK', '(71) 123-4567', 5);
INSERT INTO Employee(entityid, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(8, 'Cameron', 'Maria', 'Sales Representative', 'Ms.', '1968-01-09 00:00:00.000', '2004-03-05 00:00:00.000', '4567 - 11th Ave. N.E.', 'Seattle', 'WA', '10006', 'USA', '(206) 555-0102', 3);
INSERT INTO Employee(entityid, lastname, firstname, title, titleofcourtesy, birthdate, hiredate, address, city, region, postalcode, country, phone, mgrid)
  VALUES(9, 'Dolgopyatova', 'Zoya', 'Sales Representative', 'Ms.', '1976-01-27 00:00:00.000', '2004-11-15 00:00:00.000', '1234 Houndstooth Rd.', 'London', NULL, '10008', 'UK', '(71) 456-7890', 5);

-- ---  



INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(1, 'Customer NRZBB', 'Allen, Michael', 'Sales Representative', 'Obere Str. 0123', 'Berlin', NULL, '10092', 'Germany', '030-3456789', '030-0123456');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(2, 'Customer MLTDN', 'Hassall, Mark', 'Owner', 'Avda. de la Constitución 5678', 'México D.F.', NULL, '10077', 'Mexico', '(5) 789-0123', '(5) 456-7890');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(3, 'Customer KBUDE', 'Peoples, John', 'Owner', 'Mataderos  7890', 'México D.F.', NULL, '10097', 'Mexico', '(5) 123-4567', NULL);
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(4, 'Customer HFBZG', 'Arndt, Torsten', 'Sales Representative', '7890 Hanover Sq.', 'London', NULL, '10046', 'UK', '(171) 456-7890', '(171) 456-7891');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(5, 'Customer HGVLZ', 'Higginbotham, Tom', 'Order Administrator', 'Berguvsvägen  5678', 'Luleå', NULL, '10112', 'Sweden', '0921-67 89 01', '0921-23 45 67');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(6, 'Customer XHXJV', 'Poland, Carole', 'Sales Representative', 'Forsterstr. 7890', 'Mannheim', NULL, '10117', 'Germany', '0621-67890', '0621-12345');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(7, 'Customer QXVLA', 'Bansal, Dushyant', 'Marketing Manager', '2345, place Kléber', 'Strasbourg', NULL, '10089', 'France', '67.89.01.23', '67.89.01.24');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(8, 'Customer QUHWH', 'Ilyina, Julia', 'Owner', 'C/ Araquil, 0123', 'Madrid', NULL, '10104', 'Spain', '(91) 345 67 89', '(91) 012 34 56');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(9, 'Customer RTXGC', 'Raghav, Amritansh', 'Owner', '6789, rue des Bouchers', 'Marseille', NULL, '10105', 'France', '23.45.67.89', '23.45.67.80');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(10, 'Customer EEALV', 'Bassols, Pilar Colome', 'Accounting Manager', '8901 Tsawassen Blvd.', 'Tsawassen', 'BC', '10111', 'Canada', '(604) 901-2345', '(604) 678-9012');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(11, 'Customer UBHAU', 'Jaffe, David', 'Sales Representative', 'Fauntleroy Circus 4567', 'London', NULL, '10064', 'UK', '(171) 789-0123', NULL);
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(12, 'Customer PSNMQ', 'Ray, Mike', 'Sales Agent', 'Cerrito 3456', 'Buenos Aires', NULL, '10057', 'Argentina', '(1) 890-1234', '(1) 567-8901');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(13, 'Customer VMLOG', 'Benito, Almudena', 'Marketing Manager', 'Sierras de Granada 7890', 'México D.F.', NULL, '10056', 'Mexico', '(5) 456-7890', '(5) 123-4567');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(14, 'Customer WNMAF', 'Jelitto, Jacek', 'Owner', 'Hauptstr. 0123', 'Bern', NULL, '10065', 'Switzerland', '0452-678901', NULL);
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(15, 'Customer JUWXK', 'Richardson, Shawn', 'Sales Associate', 'Av. dos Lusíadas, 6789', 'Sao Paulo', 'SP', '10087', 'Brazil', '(11) 012-3456', NULL);
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(16, 'Customer GYBBY', 'Birkby, Dana', 'Sales Representative', 'Berkeley Gardens 0123 Brewery', 'London', NULL, '10039', 'UK', '(171) 234-5678', '(171) 234-5679');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(17, 'Customer FEVNN', 'Jones, TiAnna', 'Order Administrator', 'Walserweg 4567', 'Aachen', NULL, '10067', 'Germany', '0241-789012', '0241-345678');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(18, 'Customer BSVAR', 'Rizaldy, Arif', 'Owner', '3456, rue des Cinquante Otages', 'Nantes', NULL, '10041', 'France', '89.01.23.45', '89.01.23.46');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(19, 'Customer RFNQC', 'Boseman, Randall', 'Sales Agent', '5678 King George', 'London', NULL, '10110', 'UK', '(171) 345-6789', '(171) 345-6780');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(20, 'Customer THHDP', 'Kane, John', 'Sales Manager', 'Kirchgasse 9012', 'Graz', NULL, '10059', 'Austria', '1234-5678', '9012-3456');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(21, 'Customer KIdPX', 'Russo, Giuseppe', 'Marketing Assistant', 'Rua Orós, 3456', 'Sao Paulo', 'SP', '10096', 'Brazil', '(11) 456-7890', NULL);
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(22, 'Customer DTDMN', 'Bueno, Janaina Burdan, Neville', 'Accounting Manager', 'C/ Moralzarzal, 5678', 'Madrid', NULL, '10080', 'Spain', '(91) 890 12 34', '(91) 567 89 01');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(23, 'Customer WVFAF', 'Khanna, Karan', 'Assistant Sales Agent', '4567, chaussée de Tournai', 'Lille', NULL, '10048', 'France', '45.67.89.01', '45.67.89.02');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(24, 'Customer CYZTN', 'San Juan, Patricia', 'Owner', 'Åkergatan 5678', 'Bräcke', NULL, '10114', 'Sweden', '0695-67 89 01', NULL);
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(25, 'Customer AZJED', 'Carlson, Jason', 'Marketing Manager', 'Berliner Platz 9012', 'München', NULL, '10091', 'Germany', '089-8901234', '089-5678901');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(26, 'Customer USDBG', 'Koch, Paul', 'Marketing Manager', '9012, rue Royale', 'Nantes', NULL, '10101', 'France', '34.56.78.90', '34.56.78.91');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(27, 'Customer WMFEA', 'Schmöllerl, Martin', 'Sales Representative', 'Via Monte Bianco 4567', 'Torino', NULL, '10099', 'Italy', '011-2345678', '011-9012345');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(28, 'Customer XYUFB', 'Cavaglieri, Giorgio', 'Sales Manager', 'Jardim das rosas n. 8901', 'Lisboa', NULL, '10054', 'Portugal', '(1) 456-7890', '(1) 123-4567');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(29, 'Customer MDLWA', 'Kolesnikova, Katerina', 'Marketing Manager', 'Rambla de Cataluña, 8901', 'Barcelona', NULL, '10081', 'Spain', '(93) 789 0123', '(93) 456 7890');
INSERT INTO Customer(entityid, companyname, contactname, contacttitle, address, city, region, postalcode, country, phone, fax)
  VALUES(30, 'Customer KSLQF', 'Shabalin, Rostislav', 'Sales Manager', 'C/ Romero, 1234', 'Sevilla', NULL, '10075', 'Spain', '(95) 901 23 45', NULL);

-- Shipper 

INSERT INTO Shipper(entityid, companyname, phone)
  VALUES(1, 'Shipper GVSUA', '(503) 555-0137');
INSERT INTO Shipper(entityid, companyname, phone)
  VALUES(2, 'Shipper ETYNR', '(425) 555-0136');
INSERT INTO Shipper(entityid, companyname, phone)
  VALUES(3, 'Shipper ZHISN', '(415) 555-0138');



-- Sales Order

INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10248, 85, 5, '2006-07-04 00:00:00.000', '2006-08-01 00:00:00.000', '2006-07-16 00:00:00.000', 3, 32.38, 'Ship to 85-B', '6789 rue de l''Abbaye', 'Reims', NULL, '10345', 'France');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10249, 79, 6, '2006-07-05 00:00:00.000', '2006-08-16 00:00:00.000', '2006-07-10 00:00:00.000', 1, 11.61, 'Ship to 79-C', 'Luisenstr. 9012', 'Münster', NULL, '10328', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10250, 34, 4, '2006-07-08 00:00:00.000', '2006-08-05 00:00:00.000', '2006-07-12 00:00:00.000', 2, 65.83, 'Destination SCQXA', 'Rua do Paço, 7890', 'Rio de Janeiro', 'RJ', '10195', 'Brazil');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10251, 84, 3, '2006-07-08 00:00:00.000', '2006-08-05 00:00:00.000', '2006-07-15 00:00:00.000', 1, 41.34, 'Ship to 84-A', '3456, rue du Commerce', 'Lyon', NULL, '10342', 'France');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10252, 76, 4, '2006-07-09 00:00:00.000', '2006-08-06 00:00:00.000', '2006-07-11 00:00:00.000', 2, 51.30, 'Ship to 76-B', 'Boulevard Tirou, 9012', 'Charleroi', NULL, '10318', 'Belgium');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10253, 34, 3, '2006-07-10 00:00:00.000', '2006-07-24 00:00:00.000', '2006-07-16 00:00:00.000', 2, 58.17, 'Destination JPAIY', 'Rua do Paço, 8901', 'Rio de Janeiro', 'RJ', '10196', 'Brazil');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10254, 14, 5, '2006-07-11 00:00:00.000', '2006-08-08 00:00:00.000', '2006-07-23 00:00:00.000', 2, 22.98, 'Destination YUJRD', 'Hauptstr. 1234', 'Bern', NULL, '10139', 'Switzerland');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10255, 68, 9, '2006-07-12 00:00:00.000', '2006-08-09 00:00:00.000', '2006-07-15 00:00:00.000', 3, 148.33, 'Ship to 68-A', 'Starenweg 6789', 'Genève', NULL, '10294', 'Switzerland');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10256, 88, 3, '2006-07-15 00:00:00.000', '2006-08-12 00:00:00.000', '2006-07-17 00:00:00.000', 2, 13.97, 'Ship to 88-B', 'Rua do Mercado, 5678', 'Resende', 'SP', '10354', 'Brazil');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10257, 35, 4, '2006-07-16 00:00:00.000', '2006-08-13 00:00:00.000', '2006-07-22 00:00:00.000', 3, 81.91, 'Destination JYDLM', 'Carrera1234 con Ave. Carlos Soublette #8-35', 'San Cristóbal', 'Táchira', '10199', 'Venezuela');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10258, 20, 1, '2006-07-17 00:00:00.000', '2006-08-14 00:00:00.000', '2006-07-23 00:00:00.000', 1, 140.51, 'Destination RVDMF', 'Kirchgasse 9012', 'Graz', NULL, '10157', 'Austria');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10259, 13, 4, '2006-07-18 00:00:00.000', '2006-08-15 00:00:00.000', '2006-07-25 00:00:00.000', 3, 3.25, 'Destination LGGCH', 'Sierras de Granada 9012', 'México D.F.', NULL, '10137', 'Mexico');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10260, 56, 4, '2006-07-19 00:00:00.000', '2006-08-16 00:00:00.000', '2006-07-29 00:00:00.000', 1, 55.09, 'Ship to 56-A', 'Mehrheimerstr. 0123', 'Köln', NULL, '10258', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10261, 61, 4, '2006-07-19 00:00:00.000', '2006-08-16 00:00:00.000', '2006-07-30 00:00:00.000', 2, 3.05, 'Ship to 61-B', 'Rua da Panificadora, 6789', 'Rio de Janeiro', 'RJ', '10274', 'Brazil');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10262, 65, 8, '2006-07-22 00:00:00.000', '2006-08-19 00:00:00.000', '2006-07-25 00:00:00.000', 3, 48.29, 'Ship to 65-B', '8901 Milton Dr.', 'Albuquerque', 'NM', '10286', 'USA');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10263, 20, 9, '2006-07-23 00:00:00.000', '2006-08-20 00:00:00.000', '2006-07-31 00:00:00.000', 3, 146.06, 'Destination FFXKT', 'Kirchgasse 0123', 'Graz', NULL, '10158', 'Austria');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10264, 24, 6, '2006-07-24 00:00:00.000', '2006-08-21 00:00:00.000', '2006-08-23 00:00:00.000', 3, 3.67, 'Destination KBSBN', 'Åkergatan 9012', 'Bräcke', NULL, '10167', 'Sweden');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10265, 7, 2, '2006-07-25 00:00:00.000', '2006-08-22 00:00:00.000', '2006-08-12 00:00:00.000', 1, 55.28, 'Ship to 7-A', '0123, place Kléber', 'Strasbourg', NULL, '10329', 'France');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10266, 87, 3, '2006-07-26 00:00:00.000', '2006-09-06 00:00:00.000', '2006-07-31 00:00:00.000', 3, 25.73, 'Ship to 87-B', 'Torikatu 2345', 'Oulu', NULL, '10351', 'Finland');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10267, 25, 4, '2006-07-29 00:00:00.000', '2006-08-26 00:00:00.000', '2006-08-06 00:00:00.000', 1, 208.58, 'Destination VAPXU', 'Berliner Platz 0123', 'München', NULL, '10168', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10268, 33, 8, '2006-07-30 00:00:00.000', '2006-08-27 00:00:00.000', '2006-08-02 00:00:00.000', 3, 66.29, 'Destination QJVQH', '5ª Ave. Los Palos Grandes 5678', 'Caracas', 'DF', '10193', 'Venezuela');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10269, 89, 5, '2006-07-31 00:00:00.000', '2006-08-14 00:00:00.000', '2006-08-09 00:00:00.000', 1, 4.56, 'Ship to 89-B', '8901 - 12th Ave. S.', 'Seattle', 'WA', '10357', 'USA');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10270, 87, 1, '2006-08-01 00:00:00.000', '2006-08-29 00:00:00.000', '2006-08-02 00:00:00.000', 1, 136.54, 'Ship to 87-B', 'Torikatu 2345', 'Oulu', NULL, '10351', 'Finland');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10271, 75, 6, '2006-08-01 00:00:00.000', '2006-08-29 00:00:00.000', '2006-08-30 00:00:00.000', 2, 4.54, 'Ship to 75-C', 'P.O. Box 7890', 'Lander', 'WY', '10316', 'USA');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10272, 65, 6, '2006-08-02 00:00:00.000', '2006-08-30 00:00:00.000', '2006-08-06 00:00:00.000', 2, 98.03, 'Ship to 65-A', '7890 Milton Dr.', 'Albuquerque', 'NM', '10285', 'USA');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10273, 63, 3, '2006-08-05 00:00:00.000', '2006-09-02 00:00:00.000', '2006-08-12 00:00:00.000', 3, 76.07, 'Ship to 63-A', 'Taucherstraße 1234', 'Cunewalde', NULL, '10279', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10274, 85, 6, '2006-08-06 00:00:00.000', '2006-09-03 00:00:00.000', '2006-08-16 00:00:00.000', 1, 6.01, 'Ship to 85-B', '6789 rue de l''Abbaye', 'Reims', NULL, '10345', 'France');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10275, 49, 1, '2006-08-07 00:00:00.000', '2006-09-04 00:00:00.000', '2006-08-09 00:00:00.000', 1, 26.93, 'Ship to 49-A', 'Via Ludovico il Moro 8901', 'Bergamo', NULL, '10235', 'Italy');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10276, 80, 8, '2006-08-08 00:00:00.000', '2006-08-22 00:00:00.000', '2006-08-14 00:00:00.000', 3, 13.84, 'Ship to 80-C', 'Avda. Azteca 5678', 'México D.F.', NULL, '10334', 'Mexico');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10277, 52, 2, '2006-08-09 00:00:00.000', '2006-09-06 00:00:00.000', '2006-08-13 00:00:00.000', 3, 125.77, 'Ship to 52-A', 'Heerstr. 9012', 'Leipzig', NULL, '10247', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10278, 5, 8, '2006-08-12 00:00:00.000', '2006-09-09 00:00:00.000', '2006-08-16 00:00:00.000', 2, 92.69, 'Ship to 5-C', 'Berguvsvägen  1234', 'Luleå', NULL, '10269', 'Sweden');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10279, 44, 8, '2006-08-13 00:00:00.000', '2006-09-10 00:00:00.000', '2006-08-16 00:00:00.000', 2, 25.83, 'Ship to 44-A', 'Magazinweg 4567', 'Frankfurt a.M.', NULL, '10222', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10280, 5, 2, '2006-08-14 00:00:00.000', '2006-09-11 00:00:00.000', '2006-09-12 00:00:00.000', 1, 8.98, 'Ship to 5-B', 'Berguvsvägen  0123', 'Luleå', NULL, '10268', 'Sweden');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10281, 69, 4, '2006-08-14 00:00:00.000', '2006-08-28 00:00:00.000', '2006-08-21 00:00:00.000', 1, 2.94, 'Ship to 69-A', 'Gran Vía, 9012', 'Madrid', NULL, '10297', 'Spain');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10282, 69, 4, '2006-08-15 00:00:00.000', '2006-09-12 00:00:00.000', '2006-08-21 00:00:00.000', 1, 12.69, 'Ship to 69-B', 'Gran Vía, 0123', 'Madrid', NULL, '10298', 'Spain');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10283, 46, 3, '2006-08-16 00:00:00.000', '2006-09-13 00:00:00.000', '2006-08-23 00:00:00.000', 3, 84.81, 'Ship to 46-A', 'Carrera 0123 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '10227', 'Venezuela');
INSERT INTO SalesOrder(entityid, customerid, employeeid, orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10284, 44, 4, '2006-08-19 00:00:00.000', '2006-09-16 00:00:00.000', '2006-08-27 00:00:00.000', 1, 76.56, 'Ship to 44-A', 'Magazinweg 4567', 'Frankfurt a.M.', NULL, '10222', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10285, 63, 1, '2006-08-20 00:00:00.000', '2006-09-17 00:00:00.000', '2006-08-26 00:00:00.000', 2, 76.83, 'Ship to 63-B', 'Taucherstraße 2345', 'Cunewalde', NULL, '10280', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10286, 63, 8, '2006-08-21 00:00:00.000', '2006-09-18 00:00:00.000', '2006-08-30 00:00:00.000', 3, 229.24, 'Ship to 63-B', 'Taucherstraße 2345', 'Cunewalde', NULL, '10280', 'Germany');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10287, 67, 8, '2006-08-22 00:00:00.000', '2006-09-19 00:00:00.000', '2006-08-28 00:00:00.000', 3, 12.76, 'Ship to 67-A', 'Av. Copacabana, 3456', 'Rio de Janeiro', 'RJ', '10291', 'Brazil');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10288, 66, 4, '2006-08-23 00:00:00.000', '2006-09-20 00:00:00.000', '2006-09-03 00:00:00.000', 1, 7.45, 'Ship to 66-C', 'Strada Provinciale 2345', 'Reggio Emilia', NULL, '10290', 'Italy');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10289, 11, 7, '2006-08-26 00:00:00.000', '2006-09-23 00:00:00.000', '2006-08-28 00:00:00.000', 3, 22.77, 'Destination DLEUN', 'Fauntleroy Circus 4567', 'London', NULL, '10132', 'UK');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10290, 15, 8, '2006-08-27 00:00:00.000', '2006-09-24 00:00:00.000', '2006-09-03 00:00:00.000', 1, 79.70, 'Destination HQZHO', 'Av. dos Lusíadas, 4567', 'Sao Paulo', 'SP', '10142', 'Brazil');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10291, 61, 6, '2006-08-27 00:00:00.000', '2006-09-24 00:00:00.000', '2006-09-04 00:00:00.000', 2, 6.40, 'Ship to 61-A', 'Rua da Panificadora, 5678', 'Rio de Janeiro', 'RJ', '10273', 'Brazil');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10292, 81, 1, '2006-08-28 00:00:00.000', '2006-09-25 00:00:00.000', '2006-09-02 00:00:00.000', 2, 1.35, 'Ship to 81-A', 'Av. Inês de Castro, 6789', 'Sao Paulo', 'SP', '10335', 'Brazil');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10293, 80, 1, '2006-08-29 00:00:00.000', '2006-09-26 00:00:00.000', '2006-09-11 00:00:00.000', 3, 21.18, 'Ship to 80-B', 'Avda. Azteca 4567', 'México D.F.', NULL, '10333', 'Mexico');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10294, 65, 4, '2006-08-30 00:00:00.000', '2006-09-27 00:00:00.000', '2006-09-05 00:00:00.000', 2, 147.26, 'Ship to 65-A', '7890 Milton Dr.', 'Albuquerque', 'NM', '10285', 'USA');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10295, 85, 2, '2006-09-02 00:00:00.000', '2006-09-30 00:00:00.000', '2006-09-10 00:00:00.000', 2, 1.15, 'Ship to 85-C', '7890 rue de l''Abbaye', 'Reims', NULL, '10346', 'France');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10296, 46, 6, '2006-09-03 00:00:00.000', '2006-10-01 00:00:00.000', '2006-09-11 00:00:00.000', 1, 0.12, 'Ship to 46-C', 'Carrera 2345 con Ave. Bolívar #65-98 Llano Largo', 'Barquisimeto', 'Lara', '10229', 'Venezuela');
INSERT INTO SalesOrder(entityid, customerid, employeeid,orderdate, requireddate, shippeddate, shipperid, freight, shipname, shipaddress, shipcity, shipregion, shippostalcode, shipcountry)
  VALUES(10297, 7, 5, '2006-09-04 00:00:00.000', '2006-10-16 00:00:00.000', '2006-09-10 00:00:00.000', 2, 5.74, 'Ship to 7-C', '2345, place Kléber', 'Strasbourg', NULL, '10331', 'France');
