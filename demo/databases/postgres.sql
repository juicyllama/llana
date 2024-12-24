DROP TABLE IF EXISTS "User";

DROP TYPE IF EXISTS userrole;
CREATE TYPE userrole AS ENUM ('ADMIN','USER');

CREATE TABLE "User" 
  ( 
     "id"         SERIAL PRIMARY KEY NOT NULL, 
     "email"      VARCHAR (255) NOT NULL, 
     "password"   VARCHAR (255) NOT NULL, 
     "role"       userrole NOT NULL, 
     "firstName"  VARCHAR (255) NULL,
     "lastName"   VARCHAR (255) NULL,
     "createdAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "deletedAt"  TIMESTAMP NULL,
     UNIQUE("email")
  ); 

INSERT INTO "User"("email", "password", "role", "firstName", "lastName", "createdAt", "updatedAt", "deletedAt")
VALUES('test@test.com', '$2a$10$jm6bM7acpRa18Vdy8FSqIu4yzWAdSgZgRtRrx8zknIeZhSqPJjJU.', 'ADMIN', 'Jon', 'Doe', '2000-01-01 00:00:01', '2000-01-01 00:00:00', NULL);

  
DROP TABLE IF EXISTS "UserApiKey";

CREATE TABLE "UserApiKey"
  ( 
     "id"         SERIAL PRIMARY KEY NOT NULL, 
     "userId"     INT NOT NULL, 
     "apiKey"     VARCHAR (255) NOT NULL, 
     "createdAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
     "updatedAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
     "deletedAt"  TIMESTAMP NULL, 
     CONSTRAINT UserApiKeyUserId FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE RESTRICT
  );

INSERT INTO "UserApiKey"("userId", "apiKey", "createdAt", "updatedAt", "deletedAt")
VALUES (1, 'Ex@mp1eS$Cu7eAp!K3y', '2000-01-01 00:00:01', '2000-01-01 00:00:01', NULL);

DROP TABLE IF EXISTS "Customer";

CREATE TABLE "Customer" 
  ( 
     "custId"       SERIAL PRIMARY KEY NOT NULL, 
     "userId"     INT NOT NULL, 
     "companyName"  VARCHAR (40) NOT NULL, 
      "email"      VARCHAR (255) NULL, 
     "contactName"  VARCHAR (30) NULL, 
     "contactTitle" VARCHAR (30) NULL, 
     address      VARCHAR (60) NULL, 
     city         VARCHAR (15) NULL, 
     region       VARCHAR (15) NULL, 
     "postalCode"   VARCHAR (10) NULL, 
     country      VARCHAR (15) NULL, 
     phone        VARCHAR (24) NULL, 
     fax          VARCHAR (24) NULL,
     "createdAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "deletedAt"  TIMESTAMP NULL,
      CONSTRAINT CustomerUserId FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE RESTRICT
  ); 


DROP TABLE IF EXISTS "Employee";
CREATE TABLE "Employee" 
  ( 
     "employeeId"      SERIAL  PRIMARY KEY NOT NULL, 
     "email"      VARCHAR (255) NULL, 
     "lastName"        VARCHAR (20) NOT NULL, 
     "firstName"       VARCHAR (10) NOT NULL, 
     title           VARCHAR (30) NULL, 
     "titleOfCourtesy" VARCHAR (25) NULL, 
     "birthDate"       TIMESTAMP NULL, 
     "hireDate"        TIMESTAMP NULL, 
     address         VARCHAR (60) NULL, 
     city            VARCHAR (15) NULL, 
     region          VARCHAR (15) NULL, 
     "postalCode"      VARCHAR (10) NULL, 
     country         VARCHAR (15) NULL, 
     phone       VARCHAR (24) NULL, 
     extension       VARCHAR (4) NULL, 
     photo           BYTEA NULL, 
     notes           TEXT NULL, 
     mobile        VARCHAR (30) NULL, 
     "photoPath"       VARCHAR (255) NULL,
     "createdAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "deletedAt"  TIMESTAMP NULL
  ); 

DROP TABLE IF EXISTS "Supplier";
CREATE TABLE "Supplier" 
  ( 
     "supplierId"   SERIAL PRIMARY KEY NOT NULL, 
     "companyName"  VARCHAR (40) NOT NULL, 
     "contactName"  VARCHAR (30) NULL, 
     "contactTitle" VARCHAR (30) NULL, 
     address       VARCHAR (60) NULL, 
     city          VARCHAR (15) NULL, 
     region        VARCHAR (15) NULL, 
     "postalCode"    VARCHAR (10) NULL, 
     country       VARCHAR (15) NULL, 
     phone         VARCHAR (24) NULL, 
     fax           VARCHAR (24) NULL,
     "createdAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "deletedAt"  TIMESTAMP NULL
  );

DROP TABLE IF EXISTS "Shipper";
CREATE TABLE "Shipper" 
  ( 
     "shipperId"   SERIAL NOT NULL, 
     "companyName" VARCHAR (40) NOT NULL, 
     phone       VARCHAR (44) NULL,
     "createdAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY ( "shipperId" ) 
  ); 

DROP TABLE IF EXISTS "SalesOrder";
CREATE TABLE "SalesOrder" 
  ( 
     "orderId"        SERIAL NOT NULL, 
     "custId"         INT NULL, 
     "employeeId"     INT NULL, 
     "orderDate"      TIMESTAMP NULL, 
     "requiredDate"   TIMESTAMP NULL, 
     "shippedDate"    TIMESTAMP NULL, 
     "shipperId"      INT NULL, 
     "freight"        DECIMAL(10, 2) NULL, 
     "shipName"       VARCHAR (40) NULL, 
     "shipAddress"    VARCHAR (60) NULL, 
     "shipCity"       VARCHAR (15) NULL, 
     "shipRegion"     VARCHAR (15) NULL, 
     "shipPostalCode" VARCHAR (10) NULL, 
     "shipCountry"    VARCHAR (15) NULL,
     "createdAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "updatedAt"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     "deletedAt"  TIMESTAMP NULL,
     PRIMARY KEY ( "orderId" ),
     FOREIGN KEY ( "custId" ) REFERENCES "Customer" ( "custId" ) ON DELETE SET NULL ON UPDATE RESTRICT,
      FOREIGN KEY ( "employeeId" ) REFERENCES "Employee" ( "employeeId" ) ON DELETE SET NULL ON UPDATE RESTRICT,
      FOREIGN KEY ( "shipperId" ) REFERENCES "Shipper" ( "shipperId" ) ON DELETE SET NULL ON UPDATE RESTRICT
  );




-- Populate Employess table


INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")
  VALUES(N'Davis', N'Sara', N'CEO', N'Ms.', '19581208 00:00:00.000', '20020501 00:00:00.000', N'7890 - 20th Ave. E., Apt. 2A', N'Seattle', N'WA', N'10003', N'USA', N'(206) 555-0101');
INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")  
  VALUES(N'Funk', N'Don', N'Vice President, Sales', N'Dr.', '19620219 00:00:00.000', '20020814 00:00:00.000', N'9012 W. Capital Way', N'Tacoma', N'WA', N'10001', N'USA', N'(206) 555-0100');
INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")  
  VALUES(N'Lew', N'Judy', N'Sales Manager', N'Ms.', '19730830 00:00:00.000', '20020401 00:00:00.000', N'2345 Moss Bay Blvd.', N'Kirkland', N'WA', N'10007', N'USA', N'(206) 555-0103');
INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")  
  VALUES(N'Peled', N'Yael', N'Sales Representative', N'Mrs.', '19470919 00:00:00.000', '20030503 00:00:00.000', N'5678 Old Redmond Rd.', N'Redmond', N'WA', N'10009', N'USA', N'(206) 555-0104');
INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")  
  VALUES(N'Buck', N'Sven', N'Sales Manager', N'Mr.', '19650304 00:00:00.000', '20031017 00:00:00.000', N'8901 Garrett Hill', N'London', NULL, N'10004', N'UK', N'(71) 234-5678');
INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")  
  VALUES(N'Suurs', N'Paul', N'Sales Representative', N'Mr.', '19730702 00:00:00.000', '20031017 00:00:00.000', N'3456 Coventry House, Miner Rd.', N'London', NULL, N'10005', N'UK', N'(71) 345-6789');
INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")  
  VALUES(N'King', N'Russell', N'Sales Representative', N'Mr.', '19700529 00:00:00.000', '20040102 00:00:00.000', N'6789 Edgeham Hollow, Winchester Way', N'London', NULL, N'10002', N'UK', N'(71) 123-4567');
INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")  
  VALUES(N'Cameron', N'Maria', N'Sales Representative', N'Ms.', '19680109 00:00:00.000', '20040305 00:00:00.000', N'4567 - 11th Ave. N.E.', N'Seattle', N'WA', N'10006', N'USA', N'(206) 555-0102');
INSERT INTO "Employee"("lastName", "firstName", "title", "titleOfCourtesy", "birthDate", "hireDate", "address", "city", "region", "postalCode", "country", "phone")  
  VALUES(N'Dolgopyatova', N'Zoya', N'Sales Representative', N'Ms.', '19760127 00:00:00.000', '20041115 00:00:00.000', N'1234 Houndstooth Rd.', N'London', NULL, N'10008', N'UK', N'(71) 456-7890');

-- ---  Populate "Supplier"

INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'"Supplier" SWRXU', N'Adolphi, Stephan', N'Purchasing Manager', N'2345 Gilbert St.', N'London', NULL, N'10023', N'UK', N'(171) 456-7890', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(2, N'"Supplier" VHQZD', N'Hance, Jim', N'Order Administrator', N'P.O. Box 5678', N'New Orleans', N'LA', N'10013', N'USA', N'(100) 555-0111', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(3, N'"Supplier" STUAZ', N'Parovszky, Alfons', N'Sales Representative', N'1234 Oxford Rd.', N'Ann Arbor', N'MI', N'10026', N'USA', N'(313) 555-0109', N'(313) 555-0112');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(4, N'"Supplier" QOVFD', N'Balázs, Erzsébet', N'Marketing Manager', N'7890 Sekimai Musashino-shi', N'Tokyo', NULL, N'10011', N'Japan', N'(03) 6789-0123', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(5, N'"Supplier" EQPNC', N'Holm, Michael', N'Export Administrator', N'Calle del Rosal 4567', N'Oviedo', N'Asturias', N'10029', N'Spain', N'(98) 123 45 67', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(6, N'"Supplier" QWUSF', N'Popkova, Darya', N'Marketing Representative', N'8901 Setsuko Chuo-ku', N'Osaka', NULL, N'10028', N'Japan', N'(06) 789-0123', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(7, N'"Supplier" GQRCV', N'Ræbild, Jesper', N'Marketing Manager', N'5678 Rose St. Moonie Ponds', N'Melbourne', N'Victoria', N'10018', N'Australia', N'(03) 123-4567', N'(03) 456-7890');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(8, N'"Supplier" BWGYE', N'Iallo, Lucio', N'Sales Representative', N'9012 King''s Way', N'Manchester', NULL, N'10021', N'UK', N'(161) 567-8901', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(9, N'"Supplier" QQYEU', N'Basalik, Evan', N'Sales Agent', N'Kaloadagatan 4567', N'Göteborg', NULL, N'10022', N'Sweden', N'031-345 67 89', N'031-678 90 12');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(10, N'"Supplier" UNAHG', N'Barnett, Dave', N'Marketing Manager', N'Av. das Americanas 2345', N'Sao Paulo', NULL, N'10034', N'Brazil', N'(11) 345 6789', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(11, N'"Supplier" ZPYVS', N'Jain, Mukesh', N'Sales Manager', N'Tiergartenstraße 3456', N'Berlin', NULL, N'10016', N'Germany', N'(010) 3456789', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(12, N'"Supplier" SVIYA', N'Regev, Barak', N'International Marketing Mgr.', N'Bogenallee 9012', N'Frankfurt', NULL, N'10024', N'Germany', N'(069) 234567', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(13, N'"Supplier" TEGSC', N'Brehm, Peter', N'Coordinator Foreign Markets', N'Frahmredder 3456', N'Cuxhaven', NULL, N'10019', N'Germany', N'(04721) 1234', N'(04721) 2345');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(14, N'"Supplier" KEREV', N'Keil, Kendall', N'Sales Representative', N'Viale Dante, 6789', N'Ravenna', NULL, N'10015', N'Italy', N'(0544) 56789', N'(0544) 34567');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(15, N'"Supplier" NZLIF', N'Sałas-Szlejter, Karolina', N'Marketing Manager', N'Hatlevegen 1234', N'Sandvika', NULL, N'10025', N'Norway', N'(0)9-012345', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(16, N'"Supplier" UHZRG', N'Scholl, Thorsten', N'Regional Account Rep.', N'8901 - 8th Avenue Suite 210', N'Bend', N'OR', N'10035', N'USA', N'(503) 555-0108', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(17, N'"Supplier" QZGUF', N'Kleinerman, Christian', N'Sales Representative', N'Brovallavägen 0123', N'Stockholm', NULL, N'10033', N'Sweden', N'08-234 56 78', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(18, N'"Supplier" LVJUA', N'Canel, Fabrice', N'Sales Manager', N'3456, Rue des Francs-Bourgeois', N'Paris', NULL, N'10031', N'France', N'(1) 90.12.34.56', N'(1) 01.23.45.67');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(19, N'"Supplier" JDNUG', N'Chapman, Greg', N'Wholesale Account Agent', N'Order Processing Dept. 7890 Paul Revere Blvd.', N'Boston', N'MA', N'10027', N'USA', N'(617) 555-0110', N'(617) 555-0113');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(20, N'"Supplier" CIYNM', N'Köszegi, Emília', N'Owner', N'6789 Serangoon Loop, Suite #402', N'Singapore', NULL, N'10037', N'Singapore', N'012-3456', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(21, N'"Supplier" XOXZA', N'Shakespear, Paul', N'Sales Manager', N'Lyngbysild Fiskebakken 9012', N'Lyngby', NULL, N'10012', N'Denmark', N'67890123', N'78901234');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(22, N'"Supplier" FNUXM', N'Skelly, Bonnie L.', N'Accounting Manager', N'Verkoop Rijnweg 8901', N'Zaandam', NULL, N'10014', N'Netherlands', N'(12345) 8901', N'(12345) 5678');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(23, N'"Supplier" ELCRN', N'LaMee, Brian', N'"Product" Manager', N'Valtakatu 1234', N'Lappeenranta', NULL, N'10032', N'Finland', N'(953) 78901', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(24, N'"Supplier" JNNES', N'Clark, Molly', N'Sales Representative', N'6789 Prince Edward Parade Hunter''s Hill', N'Sydney', N'NSW', N'10030', N'Australia', N'(02) 234-5678', N'(02) 567-8901');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(25, N'"Supplier" ERVYZ', N'Sprenger, Christof', N'Marketing Manager', N'7890 Rue St. Laurent', N'Montréal', N'Québec', N'10017', N'Canada', N'(514) 456-7890', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(26, N'"Supplier" ZWZDM', N'Cunha, Gonçalo', N'Order Administrator', N'Via dei Gelsomini, 5678', N'Salerno', NULL, N'10020', N'Italy', N'(089) 4567890', N'(089) 4567890');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(27, N'"Supplier" ZRYDZ', N'Leoni, Alessandro', N'Sales Manager', N'4567, rue H. Voiron', N'Montceau', NULL, N'10036', N'France', N'89.01.23.45', NULL);
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(28, N'"Supplier" OAVQT', N'Teper, Jeff', N'Sales Representative', N'Bat. B 2345, rue des Alpes', N'Annecy', NULL, N'10010', N'France', N'01.23.45.67', N'89.01.23.45');
INSERT INTO "Supplier"("supplierId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(29, N'"Supplier" OGLRK', N'Walters, Rob', N'Accounting Manager', N'0123 rue Chasseur', N'Ste-Hyacinthe', N'Québec', N'10009', N'Canada', N'(514) 567-890', N'(514) 678-9012');



INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer NRZBB', N'Allen, Michael', N'Sales Representative', N'Obere Str. 0123', N'Berlin', NULL, N'10092', N'Germany', N'030-3456789', N'030-0123456');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer MLTDN', N'Hassall, Mark', N'Owner', N'Avda. de la Constitución 5678', N'México D.F.', NULL, N'10077', N'Mexico', N'(5) 789-0123', N'(5) 456-7890');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer KBUDE', N'Peoples, John', N'Owner', N'Mataderos  7890', N'México D.F.', NULL, N'10097', N'Mexico', N'(5) 123-4567', NULL);
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer HFBZG', N'Arndt, Torsten', N'Sales Representative', N'7890 Hanover Sq.', N'London', NULL, N'10046', N'UK', N'(171) 456-7890', N'(171) 456-7891');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer HGVLZ', N'Higginbotham, Tom', N'Order Administrator', N'Berguvsvägen  5678', N'Luleå', NULL, N'10112', N'Sweden', N'0921-67 89 01', N'0921-23 45 67');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer XHXJV', N'Poland, Carole', N'Sales Representative', N'Forsterstr. 7890', N'Mannheim', NULL, N'10117', N'Germany', N'0621-67890', N'0621-12345');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer QXVLA', N'Bansal, Dushyant', N'Marketing Manager', N'2345, place Kléber', N'Strasbourg', NULL, N'10089', N'France', N'67.89.01.23', N'67.89.01.24');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer QUHWH', N'Ilyina, Julia', N'Owner', N'C/ Araquil, 0123', N'Madrid', NULL, N'10104', N'Spain', N'(91) 345 67 89', N'(91) 012 34 56');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer RTXGC', N'Raghav, Amritansh', N'Owner', N'6789, rue des Bouchers', N'Marseille', NULL, N'10105', N'France', N'23.45.67.89', N'23.45.67.80');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer EEALV', N'Bassols, Pilar Colome', N'Accounting Manager', N'8901 Tsawassen Blvd.', N'Tsawassen', N'BC', N'10111', N'Canada', N'(604) 901-2345', N'(604) 678-9012');
INSERT INTO "Customer"("userId", "companyName", "contactName", "contactTitle", address, city, region, "postalCode", country, phone, fax)
  VALUES(1, N'Customer UBHAU', N'Jaffe, David', N'Sales Representative', N'Fauntleroy Circus 4567', N'London', NULL, N'10064', N'UK', N'(171) 789-0123', NULL);

INSERT INTO "Shipper"("shipperId", "companyName", phone)
  VALUES(1, N'"Shipper" GVSUA', N'(503) 555-0137');
INSERT INTO "Shipper"("shipperId", "companyName", phone)
  VALUES(2, N'"Shipper" ETYNR', N'(425) 555-0136');
INSERT INTO "Shipper"("shipperId", "companyName", phone)
  VALUES(3, N'"Shipper" ZHISN', N'(415) 555-0138');


INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(1, 1, 5, '20060704 00:00:00.000', '20060801 00:00:00.000', '20060716 00:00:00.000', 3, 32.38, N'Ship to 85-B', N'6789 rue de l''Abbaye', N'Reims', NULL, N'10345', N'France');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(2, 2, 6, '20060705 00:00:00.000', '20060816 00:00:00.000', '20060710 00:00:00.000', 1, 11.61, N'Ship to 79-C', N'Luisenstr. 9012', N'Münster', NULL, N'10328', N'Germany');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(3, 3, 4, '20060708 00:00:00.000', '20060805 00:00:00.000', '20060712 00:00:00.000', 2, 65.83, N'Destination SCQXA', N'Rua do Paço, 7890', N'Rio de Janeiro', N'RJ', N'10195', N'Brazil');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(4, 4, 3, '20060708 00:00:00.000', '20060805 00:00:00.000', '20060715 00:00:00.000', 1, 41.34, N'Ship to 84-A', N'3456, rue du Commerce', N'Lyon', NULL, N'10342', N'France');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(5, 5, 4, '20060709 00:00:00.000', '20060806 00:00:00.000', '20060711 00:00:00.000', 2, 51.30, N'Ship to 76-B', N'Boulevard Tirou, 9012', N'Charleroi', NULL, N'10318', N'Belgium');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(6, 6, 3, '20060710 00:00:00.000', '20060724 00:00:00.000', '20060716 00:00:00.000', 2, 58.17, N'Destination JPAIY', N'Rua do Paço, 8901', N'Rio de Janeiro', N'RJ', N'10196', N'Brazil');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(7, 7, 5, '20060711 00:00:00.000', '20060808 00:00:00.000', '20060723 00:00:00.000', 2, 22.98, N'Destination YUJRD', N'Hauptstr. 1234', N'Bern', NULL, N'10139', N'Switzerland');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(8, 8, 9, '20060712 00:00:00.000', '20060809 00:00:00.000', '20060715 00:00:00.000', 3, 148.33, N'Ship to 68-A', N'Starenweg 6789', N'Genève', NULL, N'10294', N'Switzerland');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(9, 9, 3, '20060715 00:00:00.000', '20060812 00:00:00.000', '20060717 00:00:00.000', 2, 13.97, N'Ship to 88-B', N'Rua do Mercado, 5678', N'Resende', N'SP', N'10354', N'Brazil');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(10, 1, 4, '20060716 00:00:00.000', '20060813 00:00:00.000', '20060722 00:00:00.000', 3, 81.91, N'Destination JYDLM', N'Carrera1234 con Ave. Carlos Soublette #8-35', N'San Cristóbal', N'Táchira', N'10199', N'Venezuela');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(11, 2, 1, '20060717 00:00:00.000', '20060814 00:00:00.000', '20060723 00:00:00.000', 1, 140.51, N'Destination RVDMF', N'Kirchgasse 9012', N'Graz', NULL, N'10157', N'Austria');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(12, 3, 4, '20060718 00:00:00.000', '20060815 00:00:00.000', '20060725 00:00:00.000', 3, 3.25, N'Destination LGGCH', N'Sierras de Granada 9012', N'México D.F.', NULL, N'10137', N'Mexico');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(13, 4, 4, '20060719 00:00:00.000', '20060816 00:00:00.000', '20060729 00:00:00.000', 1, 55.09, N'Ship to 56-A', N'Mehrheimerstr. 0123', N'Köln', NULL, N'10258', N'Germany');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(14, 5, 4, '20060719 00:00:00.000', '20060816 00:00:00.000', '20060730 00:00:00.000', 2, 3.05, N'Ship to 61-B', N'Rua da Panificadora, 6789', N'Rio de Janeiro', N'RJ', N'10274', N'Brazil');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(15, 6, 8, '20060722 00:00:00.000', '20060819 00:00:00.000', '20060725 00:00:00.000', 3, 48.29, N'Ship to 65-B', N'8901 Milton Dr.', N'Albuquerque', N'NM', N'10286', N'USA');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(16, 7, 9, '20060723 00:00:00.000', '20060820 00:00:00.000', '20060731 00:00:00.000', 3, 146.06, N'Destination FFXKT', N'Kirchgasse 0123', N'Graz', NULL, N'10158', N'Austria');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(17, 8, 6, '20060724 00:00:00.000', '20060821 00:00:00.000', '20060823 00:00:00.000', 3, 3.67, N'Destination KBSBN', N'Åkergatan 9012', N'Bräcke', NULL, N'10167', N'Sweden');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(18, 7, 2, '20060725 00:00:00.000', '20060822 00:00:00.000', '20060812 00:00:00.000', 1, 55.28, N'Ship to 7-A', N'0123, place Kléber', N'Strasbourg', NULL, N'10329', N'France');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(19, 9, 3, '20060726 00:00:00.000', '20060906 00:00:00.000', '20060731 00:00:00.000', 3, 25.73, N'Ship to 87-B', N'Torikatu 2345', N'Oulu', NULL, N'10351', N'Finland');
INSERT INTO "SalesOrder"("orderId", "custId", "employeeId", "orderDate", "requiredDate", "shippedDate", "shipperId", freight, "shipName", "shipAddress", "shipCity", "shipRegion", "shipPostalCode", "shipCountry")
  VALUES(20, 1, 4, '20060729 00:00:00.000', '20060826 00:00:00.000', '20060806 00:00:00.000', 1, 208.58, N'Destination VAPXU', N'Berliner Platz 0123', N'München', NULL, N'10168', N'Germany');
