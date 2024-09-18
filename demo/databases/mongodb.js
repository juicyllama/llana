//seed
db = db.getSiblingDB('llana');

db.User.insert({
        "email": "test@test.com", 
        "password": "$2a$10$jm6bM7acpRa18Vdy8FSqIu4yzWAdSgZgRtRrx8zknIeZhSqPJjJU.",
        "role": "ADMIN",
        "firstName": "Jon",
        "lastName": "Doe",
        "createdAt": "2000-01-01 00:00:01",
        "updatedAt": "2000-01-01 00:00:01",
        "deletedAt": null,
        "UserApiKey": {
            "apiKey": "Ex@mp1eS$Cu7eAp!K3y",
            "createdAt": "2000-01-01 00:00:01",
            "updatedAt": "2000-01-01 00:00:01",
            "deletedAt": null
        }
 });

 //get last inserted id

var user = db.User.findOne({email: "test@test.com"});

db.UserApiKey.insert({
    "userId": user._id,
    "apiKey": "Ex@mp1eS$Cu7eAp!K3y",
    "createdAt": "2000-01-01 00:00:01",
    "updatedAt": "2000-01-01 00:00:01",
    "deletedAt": null
});

// Insert customers

const customers = db.Customer.insertMany([{
        "_id": 1,
        "fax": "030-0123456",
        "city": "Berlin",
        "email": null,
        "phone": "030-3456789",
        "mobile": null,
        "region": null,
        "address": "Obere Str. 0123",
        "country": "Germany",
        "entityId": 1,
        "postalCode": "10092",
        "companyName": "Customer NRZBB",
        "contactName": "Allen, Michael",
        "contactTitle": "Sales Representative"
    }, {
        "_id": 2,
        "fax": "(5) 456-7890",
        "city": "México D.F.",
        "email": null,
        "phone": "(5) 789-0123",
        "mobile": null,
        "region": null,
        "address": "Avda. de la Constitución 5678",
        "country": "Mexico",
        "entityId": 2,
        "postalCode": "10077",
        "companyName": "Customer MLTDN",
        "contactName": "Hassall, Mark",
        "contactTitle": "Owner"
    }, {
        "_id": 3,
        "fax": null,
        "city": "México D.F.",
        "email": null,
        "phone": "(5) 123-4567",
        "mobile": null,
        "region": null,
        "address": "Mataderos  7890",
        "country": "Mexico",
        "entityId": 3,
        "postalCode": "10097",
        "companyName": "Customer KBUDE",
        "contactName": "Peoples, John",
        "contactTitle": "Owner"
    }, {
        "_id": 4,
        "fax": "(171) 456-7891",
        "city": "London",
        "email": null,
        "phone": "(171) 456-7890",
        "mobile": null,
        "region": null,
        "address": "7890 Hanover Sq.",
        "country": "UK",
        "entityId": 4,
        "postalCode": "10046",
        "companyName": "Customer HFBZG",
        "contactName": "Arndt, Torsten",
        "contactTitle": "Sales Representative"
    }, {
        "_id": 5,
        "fax": "0921-23 45 67",
        "city": "Luleå",
        "email": null,
        "phone": "0921-67 89 01",
        "mobile": null,
        "region": null,
        "address": "Berguvsvägen  5678",
        "country": "Sweden",
        "entityId": 5,
        "postalCode": "10112",
        "companyName": "Customer HGVLZ",
        "contactName": "Higginbotham, Tom",
        "contactTitle": "Order Administrator"
    }, {
        "_id": 6,
        "fax": "0621-12345",
        "city": "Mannheim",
        "email": null,
        "phone": "0621-67890",
        "mobile": null,
        "region": null,
        "address": "Forsterstr. 7890",
        "country": "Germany",
        "entityId": 6,
        "postalCode": "10117",
        "companyName": "Customer XHXJV",
        "contactName": "Poland, Carole",
        "contactTitle": "Sales Representative"
    }, {
        "_id": 7,
        "fax": "67.89.01.24",
        "city": "Strasbourg",
        "email": null,
        "phone": "67.89.01.23",
        "mobile": null,
        "region": null,
        "address": "2345, place Kléber",
        "country": "France",
        "entityId": 7,
        "postalCode": "10089",
        "companyName": "Customer QXVLA",
        "contactName": "Bansal, Dushyant",
        "contactTitle": "Marketing Manager"
    }, {
        "_id": 8,
        "fax": "(91) 012 34 56",
        "city": "Madrid",
        "email": null,
        "phone": "(91) 345 67 89",
        "mobile": null,
        "region": null,
        "address": "C/ Araquil, 0123",
        "country": "Spain",
        "entityId": 8,
        "postalCode": "10104",
        "companyName": "Customer QUHWH",
        "contactName": "Ilyina, Julia",
        "contactTitle": "Owner"
    }, {
        "_id": 9,
        "fax": "23.45.67.80",
        "city": "Marseille",
        "email": null,
        "phone": "23.45.67.89",
        "mobile": null,
        "region": null,
        "address": "6789, rue des Bouchers",
        "country": "France",
        "entityId": 9,
        "postalCode": "10105",
        "companyName": "Customer RTXGC",
        "contactName": "Raghav, Amritansh",
        "contactTitle": "Owner"
    }, {
        "_id": 10,
        "fax": "(604) 678-9012",
        "city": "Tsawassen",
        "email": null,
        "phone": "(604) 901-2345",
        "mobile": null,
        "region": "BC",
        "address": "8901 Tsawassen Blvd.",
        "country": "Canada",
        "entityId": 10,
        "postalCode": "10111",
        "companyName": "Customer EEALV",
        "contactName": "Bassols, Pilar Colome",
        "contactTitle": "Accounting Manager"
    }]);

// Employees

const employees = db.Employee.insertMany([{
        "_id": 1,
        "city": "Seattle",
        "email": null,
        "mgrId": null,
        "notes": null,
        "phone": "(206) 555-0101",
        "photo": null,
        "title": "CEO",
        "mobile": null,
        "region": "WA",
        "address": "7890 - 20th Ave. E., Apt. 2A",
        "country": "USA",
        "entityId": 1,
        "hireDate": "2002-05-01 00:00:00.000000",
        "lastname": "Davis",
        "birthDate": "1958-12-08 00:00:00.000000",
        "extension": null,
        "firstname": "Sara",
        "photoPath": null,
        "postalCode": "10003",
        "titleOfCourtesy": "Ms."
    }, {
        "_id": 2,
        "city": "Tacoma",
        "email": null,
        "mgrId": 1,
        "notes": null,
        "phone": "(206) 555-0100",
        "photo": null,
        "title": "Vice President, Sales",
        "mobile": null,
        "region": "WA",
        "address": "9012 W. Capital Way",
        "country": "USA",
        "entityId": 2,
        "hireDate": "2002-08-14 00:00:00.000000",
        "lastname": "Funk",
        "birthDate": "1962-02-19 00:00:00.000000",
        "extension": null,
        "firstname": "Don",
        "photoPath": null,
        "postalCode": "10001",
        "titleOfCourtesy": "Dr."
    }, {
        "_id": 3,
        "city": "Kirkland",
        "email": null,
        "mgrId": 2,
        "notes": null,
        "phone": "(206) 555-0103",
        "photo": null,
        "title": "Sales Manager",
        "mobile": null,
        "region": "WA",
        "address": "2345 Moss Bay Blvd.",
        "country": "USA",
        "entityId": 3,
        "hireDate": "2002-04-01 00:00:00.000000",
        "lastname": "Lew",
        "birthDate": "1973-08-30 00:00:00.000000",
        "extension": null,
        "firstname": "Judy",
        "photoPath": null,
        "postalCode": "10007",
        "titleOfCourtesy": "Ms."
    }, {
        "_id": 4,
        "city": "Redmond",
        "email": null,
        "mgrId": 3,
        "notes": null,
        "phone": "(206) 555-0104",
        "photo": null,
        "title": "Sales Representative",
        "mobile": null,
        "region": "WA",
        "address": "5678 Old Redmond Rd.",
        "country": "USA",
        "entityId": 4,
        "hireDate": "2003-05-03 00:00:00.000000",
        "lastname": "Peled",
        "birthDate": "1947-09-19 00:00:00.000000",
        "extension": null,
        "firstname": "Yael",
        "photoPath": null,
        "postalCode": "10009",
        "titleOfCourtesy": "Mrs."
    }, {
        "_id": 5,
        "city": "London",
        "email": null,
        "mgrId": 2,
        "notes": null,
        "phone": "(71) 234-5678",
        "photo": null,
        "title": "Sales Manager",
        "mobile": null,
        "region": null,
        "address": "8901 Garrett Hill",
        "country": "UK",
        "entityId": 5,
        "hireDate": "2003-10-17 00:00:00.000000",
        "lastname": "Buck",
        "birthDate": "1965-03-04 00:00:00.000000",
        "extension": null,
        "firstname": "Sven",
        "photoPath": null,
        "postalCode": "10004",
        "titleOfCourtesy": "Mr."
    }]);

// Shippers

const shippers = db.Shipper.insertMany([{
    "_id": 1,
        "phone": "(503) 555-0137",
        "entityId": 1,
        "companyName": "Shipper GVSUA"
    }, {
        "_id": 2,
        "phone": "(425) 555-0136",
        "entityId": 2,
        "companyName": "Shipper ETYNR"
    }, {
        "_id": 3,
        "phone": "(415) 555-0138",
        "entityId": 3,
        "companyName": "Shipper ZHISN"
    }]);

// Orders

const orders = db.SalesOrder.insertMany([{
            "freight": 32.38,
            "entityId": 10248,
            "shipCity": "Reims",
            "shipName": "Ship to 85-B",
            "orderDate": "2006-07-04 00:00:00.000000",
            "Shipper": {
                "_id": 1,
            },
            "Customer": {
                "_id": 1,
            },
            "Employee": {
                "_id": 1,
            },
            "shipRegion": null,
            "shipAddress": "6789 rue de l'Abbaye",
            "shipCountry": "France",
            "shippedDate": "2006-07-16 00:00:00.000000",
            "requiredDate": "2006-08-01 00:00:00.000000",
            "shipPostalCode": "10345"
        }, {
            "freight": 11.61,
            "entityId": 10249,
            "shipCity": "Münster",
            "shipName": "Ship to 79-C",
            "orderDate": "2006-07-05 00:00:00.000000",
            "Shipper": {
                "_id": 1,
            },
            "Customer": {
                "_id": 2,
            },
            "Employee": {
                "_id": 1,
            },
            "shipRegion": null,
            "shipAddress": "Luisenstr. 9012",
            "shipCountry": "Germany",
            "shippedDate": "2006-07-10 00:00:00.000000",
            "requiredDate": "2006-08-16 00:00:00.000000",
            "shipPostalCode": "10328"
        }, {
            "freight": 65.83,
            "entityId": 10250,
            "shipCity": "Rio de Janeiro",
            "shipName": "Destination SCQXA",
            "orderDate": "2006-07-08 00:00:00.000000",
            "Shipper": {
                "_id": 1,
            },
            "Customer": {
                "_id": 3,
            },
            "Employee": {
                "_id": 1,
            },
            "shipRegion": "RJ",
            "shipAddress": "Rua do Paço, 7890",
            "shipCountry": "Brazil",
            "shippedDate": "2006-07-12 00:00:00.000000",
            "requiredDate": "2006-08-05 00:00:00.000000",
            "shipPostalCode": "10195"
        }, {
            "freight": 41.34,
            "entityId": 10251,
            "shipCity": "Lyon",
            "shipName": "Ship to 84-A",
            "orderDate": "2006-07-08 00:00:00.000000",
            "Shipper": {
                "_id": 1,
            },
            "Customer": {
                "_id": 4,
            },
            "Employee": {
                "_id": 1,
            },
            "shipRegion": null,
            "shipAddress": "3456, rue du Commerce",
            "shipCountry": "France",
            "shippedDate": "2006-07-15 00:00:00.000000",
            "requiredDate": "2006-08-05 00:00:00.000000",
            "shipPostalCode": "10342"
        }, {
            "freight": 51.30,
            "entityId": 10252,
            "shipCity": "Charleroi",
            "shipName": "Ship to 76-B",
            "orderDate": "2006-07-09 00:00:00.000000",
            "Shipper": {
                "_id": 2,
            },
            "Customer": {
                "_id": 5,
            },
            "Employee": {
                "_id": 2,
            },
            "shipRegion": null,
            "shipAddress": "Boulevard Tirou, 9012",
            "shipCountry": "Belgium",
            "shippedDate": "2006-07-11 00:00:00.000000",
            "requiredDate": "2006-08-06 00:00:00.000000",
            "shipPostalCode": "10318"
        }, {
            "freight": 58.17,
            "entityId": 10253,
            "shipCity": "Rio de Janeiro",
            "shipName": "Destination JPAIY",
            "orderDate": "2006-07-10 00:00:00.000000",
            "Shipper": {
                "_id": 2,
            },
            "Customer": {
                "_id": 6,
            },
            "Employee": {
                "_id": 2,
            },
            "shipRegion": "RJ",
            "shipAddress": "Rua do Paço, 8901",
            "shipCountry": "Brazil",
            "shippedDate": "2006-07-16 00:00:00.000000",
            "requiredDate": "2006-07-24 00:00:00.000000",
            "shipPostalCode": "10196"
        }, {
            "freight": 22.98,
            "entityId": 10254,
            "shipCity": "Bern",
            "shipName": "Destination YUJRD",
            "orderDate": "2006-07-11 00:00:00.000000",
            "Shipper": {
                "_id": 2,
            },
            "Customer": {
                "_id": 5,
            },
            "Employee": {
                "_id": 2,
            },
            "shipRegion": null,
            "shipAddress": "Hauptstr. 1234",
            "shipCountry": "Switzerland",
            "shippedDate": "2006-07-23 00:00:00.000000",
            "requiredDate": "2006-08-08 00:00:00.000000",
            "shipPostalCode": "10139"
        }, {
            "freight": 148.33,
            "entityId": 10255,
            "shipCity": "Genève",
            "shipName": "Ship to 68-A",
            "orderDate": "2006-07-12 00:00:00.000000",
            "Shipper": {
                "_id": 2,
            },
            "Customer": {
                "_id": 7,
            },
            "Employee": {
                "_id": 3,
            },
            "shipRegion": null,
            "shipAddress": "Starenweg 6789",
            "shipCountry": "Switzerland",
            "shippedDate": "2006-07-15 00:00:00.000000",
            "requiredDate": "2006-08-09 00:00:00.000000",
            "shipPostalCode": "10294"
        }, {
            "freight": 13.97,
            "entityId": 10256,
            "shipCity": "Resende",
            "shipName": "Ship to 88-B",
            "orderDate": "2006-07-15 00:00:00.000000",
            "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 8,
            },
            "Employee": {
                "_id": 3,
            },
            "shipRegion": "SP",
            "shipAddress": "Rua do Mercado, 5678",
            "shipCountry": "Brazil",
            "shippedDate": "2006-07-17 00:00:00.000000",
            "requiredDate": "2006-08-12 00:00:00.000000",
            "shipPostalCode": "10354"
        }, {
            "freight": 81.91,
            "entityId": 10257,
            "shipCity": "San Cristóbal",
            "shipName": "Destination JYDLM",
            "orderDate": "2006-07-16 00:00:00.000000",
            "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 9,
            },
            "Employee": {
                "_id": 4,
            },
            "shipRegion": "Táchira",
            "shipAddress": "Carrera1234 con Ave. Carlos Soublette #8-35",
            "shipCountry": "Venezuela",
            "shippedDate": "2006-07-22 00:00:00.000000",
            "requiredDate": "2006-08-13 00:00:00.000000",
            "shipPostalCode": "10199"
        }, {
            "freight": 140.51,
            "entityId": 10258,
            "shipCity": "Graz",
            "shipName": "Destination RVDMF",
            "orderDate": "2006-07-17 00:00:00.000000",
            "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 10,
            },
            "Employee": {
                "_id": 4,
            },
            "shipRegion": null,
            "shipAddress": "Kirchgasse 9012",
            "shipCountry": "Austria",
            "shippedDate": "2006-07-23 00:00:00.000000",
            "requiredDate": "2006-08-14 00:00:00.000000",
            "shipPostalCode": "10157"
        }, {
            "freight": 3.25,
            "entityId": 10259,
            "shipCity": "México D.F.",
            "shipName": "Destination LGGCH",
            "orderDate": "2006-07-18 00:00:00.000000",
            "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 10,
            },
            "Employee": {
                "_id": 5,
            },
            "shipRegion": null,
            "shipAddress": "Sierras de Granada 9012",
            "shipCountry": "Mexico",
            "shippedDate": "2006-07-25 00:00:00.000000",
            "requiredDate": "2006-08-15 00:00:00.000000",
            "shipPostalCode": "10137"
        }, {
            "freight": 55.09,
            "entityId": 10260,
            "shipCity": "Köln",
            "shipName": "Ship to 56-A",
            "orderDate": "2006-07-19 00:00:00.000000",
           "Shipper": {
                "_id": 1,
            },
            "Customer": {
                "_id": 10,
            },
            "Employee": {
                "_id": 5,
            },
            "shipRegion": null,
            "shipAddress": "Mehrheimerstr. 0123",
            "shipCountry": "Germany",
            "shippedDate": "2006-07-29 00:00:00.000000",
            "requiredDate": "2006-08-16 00:00:00.000000",
            "shipPostalCode": "10258"
        }, {
            "freight": 3.05,
            "entityId": 10261,
            "shipCity": "Rio de Janeiro",
            "shipName": "Ship to 61-B",
            "orderDate": "2006-07-19 00:00:00.000000",
            "Shipper": {
                "_id": 2,
            },
            "Customer": {
                "_id": 10,
            },
            "Employee": {
                "_id": 5,
            },
            "shipRegion": "RJ",
            "shipAddress": "Rua da Panificadora, 6789",
            "shipCountry": "Brazil",
            "shippedDate": "2006-07-30 00:00:00.000000",
            "requiredDate": "2006-08-16 00:00:00.000000",
            "shipPostalCode": "10274"
        }, {
            "freight": 48.29,
            "entityId": 10262,
            "shipCity": "Albuquerque",
            "shipName": "Ship to 65-B",
            "orderDate": "2006-07-22 00:00:00.000000",
            "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 10,
            },
            "Employee": {
                "_id": 5,
            },
            "shipRegion": "NM",
            "shipAddress": "8901 Milton Dr.",
            "shipCountry": "USA",
            "shippedDate": "2006-07-25 00:00:00.000000",
            "requiredDate": "2006-08-19 00:00:00.000000",
            "shipPostalCode": "10286"
        }, {
            "freight": 146.06,
            "entityId": 10263,
            "shipCity": "Graz",
            "shipName": "Destination FFXKT",
            "orderDate": "2006-07-23 00:00:00.000000",
           "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 1,
            },
            "Employee": {
                "_id": 5,
            },
            "shipRegion": null,
            "shipAddress": "Kirchgasse 0123",
            "shipCountry": "Austria",
            "shippedDate": "2006-07-31 00:00:00.000000",
            "requiredDate": "2006-08-20 00:00:00.000000",
            "shipPostalCode": "10158"
        }, {
            "freight": 3.67,
            "entityId": 10264,
            "shipCity": "Bräcke",
            "shipName": "Destination KBSBN",
            "orderDate": "2006-07-24 00:00:00.000000",
           "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 2,
            },
            "Employee": {
                "_id": 5,
            },
            "shipRegion": null,
            "shipAddress": "Åkergatan 9012",
            "shipCountry": "Sweden",
            "shippedDate": "2006-08-23 00:00:00.000000",
            "requiredDate": "2006-08-21 00:00:00.000000",
            "shipPostalCode": "10167"
        }, {
            "freight": 55.28,
            "entityId": 10265,
            "shipCity": "Strasbourg",
            "shipName": "Ship to 7-A",
            "orderDate": "2006-07-25 00:00:00.000000",
           "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 3,
            },
            "Employee": {
                "_id": 3,
            },
            "shipRegion": null,
            "shipAddress": "0123, place Kléber",
            "shipCountry": "France",
            "shippedDate": "2006-08-12 00:00:00.000000",
            "requiredDate": "2006-08-22 00:00:00.000000",
            "shipPostalCode": "10329"
        }, {
            "freight": 25.73,
            "entityId": 10266,
            "shipCity": "Oulu",
            "shipName": "Ship to 87-B",
            "orderDate": "2006-07-26 00:00:00.000000",
           "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 3,
            },
            "Employee": {
                "_id": 3,
            },
            "shipRegion": null,
            "shipAddress": "Torikatu 2345",
            "shipCountry": "Finland",
            "shippedDate": "2006-07-31 00:00:00.000000",
            "requiredDate": "2006-09-06 00:00:00.000000",
            "shipPostalCode": "10351"
        }, {
            "freight": 208.58,
            "entityId": 10267,
            "shipCity": "München",
            "shipName": "Destination VAPXU",
            "orderDate": "2006-07-29 00:00:00.000000",
           "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 3,
            },
            "Employee": {
                "_id": 3,
            },
            "shipRegion": null,
            "shipAddress": "Berliner Platz 0123",
            "shipCountry": "Germany",
            "shippedDate": "2006-08-06 00:00:00.000000",
            "requiredDate": "2006-08-26 00:00:00.000000",
            "shipPostalCode": "10168"
        }, {
            "freight": 66.29,
            "entityId": 10268,
            "shipCity": "Caracas",
            "shipName": "Destination QJVQH",
            "orderDate": "2006-07-30 00:00:00.000000",
           "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 3,
            },
            "Employee": {
                "_id": 3,
            },
            "shipRegion": "DF",
            "shipAddress": "5ª Ave. Los Palos Grandes 5678",
            "shipCountry": "Venezuela",
            "shippedDate": "2006-08-02 00:00:00.000000",
            "requiredDate": "2006-08-27 00:00:00.000000",
            "shipPostalCode": "10193"
        }, {
            "freight": 4.56,
            "entityId": 10269,
            "shipCity": "Seattle",
            "shipName": "Ship to 89-B",
            "orderDate": "2006-07-31 00:00:00.000000",
          "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 4,
            },
            "Employee": {
                "_id": 1,
            },
            "shipRegion": "WA",
            "shipAddress": "8901 - 12th Ave. S.",
            "shipCountry": "USA",
            "shippedDate": "2006-08-09 00:00:00.000000",
            "requiredDate": "2006-08-14 00:00:00.000000",
            "shipPostalCode": "10357"
        }, {
            "freight": 136.54,
            "entityId": 10270,
            "shipCity": "Oulu",
            "shipName": "Ship to 87-B",
            "orderDate": "2006-08-01 00:00:00.000000",
          "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 4,
            },
            "Employee": {
                "_id": 1,
            },
            "shipRegion": null,
            "shipAddress": "Torikatu 2345",
            "shipCountry": "Finland",
            "shippedDate": "2006-08-02 00:00:00.000000",
            "requiredDate": "2006-08-29 00:00:00.000000",
            "shipPostalCode": "10351"
        }, {
            "freight": 4.54,
            "entityId": 10271,
            "shipCity": "Lander",
            "shipName": "Ship to 75-C",
            "orderDate": "2006-08-01 00:00:00.000000",
           "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 4,
            },
            "Employee": {
                "_id": 1,
            },
            "shipRegion": "WY",
            "shipAddress": "P.O. Box 7890",
            "shipCountry": "USA",
            "shippedDate": "2006-08-30 00:00:00.000000",
            "requiredDate": "2006-08-29 00:00:00.000000",
            "shipPostalCode": "10316"
        }, {
            "freight": 98.03,
            "entityId": 10272,
            "shipCity": "Albuquerque",
            "shipName": "Ship to 65-A",
            "orderDate": "2006-08-02 00:00:00.000000",
           "Shipper": {
                "_id": 3,
            },
            "Customer": {
                "_id": 5,
            },
            "Employee": {
                "_id": 1,
            },
            "shipRegion": "NM",
            "shipAddress": "7890 Milton Dr.",
            "shipCountry": "USA",
            "shippedDate": "2006-08-06 00:00:00.000000",
            "requiredDate": "2006-08-30 00:00:00.000000",
            "shipPostalCode": "10285"
        }]);



print("Data has been written to the collections");
