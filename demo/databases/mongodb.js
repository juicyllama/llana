const Customers = require('./json/Customer.json');
const Employees = require('./json/Employee.json');
const Shippers = require('./json/Shipper.json');

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

const user = db.User.findOne({email: "test@test.com"});

// Manual Relations Table
db.createCollection("_llana_relation")

db.getCollection("_llana_relation").insertMany([{
    "table": "Customer",
    "column": "_id",
    "org_table": "SalesOrder",
    "org_column": "custId"
}, {
    "table": "Employee",
    "column": "_id",
    "org_table": "SalesOrder",
    "org_column": "employeeId"
}, {
    "table": "Shipper",
    "column": "_id",
    "org_table": "SalesOrder",
    "org_column": "shipperId"
},{
    "table": "User",
    "column": "_id",
    "org_table": "_llana_webhook",
    "org_column": "user_identifier"
}]);

db.createCollection("_llana_webhook")

db.getCollection("_llana_webhook").insert({
    "type": "POST", 
    "url": "https://wh9491c816237e1c710e.free.beeceptor.com",
    "table": "Customer",
    "user_identifier": user._id,
    "on_create": true,
    "on_update":  true,
    "on_delete":  true,
    "deletedAt": null,
});

const webhook = db.getCollection("_llana_webhook").findOne({table: "Customer"});

db.createCollection("_llana_webhook_log")

db.getCollection("_llana_webhook_log").insert({
    "webhook_id": webhook._id, 
    "type": "INSERT",
    "url": "https://wh9491c816237e1c710e.free.beeceptor.com",
    "record_key": "custId",
    "record_id": new ObjectId(),
    "attempt": 1,
    "delivered":  true,
    "response_status": 200,
    "response_message": "Success",
    "created_at":  new Date(),
    "next_attempt_at":  null,
    "delivered_at": new Date(),
});


db.UserApiKey.insert({
    "userId": user._id,
    "apiKey": "Ex@mp1eS$Cu7eAp!K3y",
    "createdAt": "2000-01-01 00:00:01",
    "updatedAt": "2000-01-01 00:00:01",
    "deletedAt": null
});

// Insert customers

const customers = db.Customer.insertMany(Customers);

const customer1 = db.Customer.findOne({companyName: "Customer NRZBB"});
const customer2 = db.Customer.findOne({companyName: "Customer MLTDN"});
const customer3 = db.Customer.findOne({companyName: "Customer KBUDE"});
const customer4 = db.Customer.findOne({companyName: "Customer HFBZG"});
const customer5 = db.Customer.findOne({companyName: "Customer HGVLZ"});
const customer6 = db.Customer.findOne({companyName: "Customer XHXJV"});
const customer7 = db.Customer.findOne({companyName: "Customer QXVLA"});
const customer8 = db.Customer.findOne({companyName: "Customer QUHWH"});
const customer9 = db.Customer.findOne({companyName: "Customer RTXGC"});
const customer10 = db.Customer.findOne({companyName: "Customer EEALV"});

// Employees

const employees = db.Employee.insertMany(Employees);

const employee1 = db.Employee.findOne({firstname: "Sara"});
const employee2 = db.Employee.findOne({firstname: "Don"});
const employee3 = db.Employee.findOne({firstname: "Judy"});
const employee4 = db.Employee.findOne({firstname: "Yael"});
const employee5 = db.Employee.findOne({firstname: "Sven"});

// Shippers

const shippers = db.Shipper.insertMany(Shippers);

// Get Shipper Ids
const shipper1 = db.Shipper.findOne({companyName: "Shipper GVSUA"});
const shipper2 = db.Shipper.findOne({companyName: "Shipper ETYNR"});
const shipper3 = db.Shipper.findOne({companyName: "Shipper ZHISN"});

// Orders

const orders = db.SalesOrder.insertMany([{
            "freight": 32.38,
            "shipCity": "Reims",
            "shipName": "Ship to 85-B",
            "orderDate": "2006-07-04 00:00:00.000000",
            "shipperId": shipper1._id,
            "custId": customer1._id,
            "employeeId": employee1._id,
            "shipRegion": null,
            "shipAddress": "6789 rue de l'Abbaye",
            "shipCountry": "France",
            "shippedDate": "2006-07-16 00:00:00.000000",
            "requiredDate": "2006-08-01 00:00:00.000000",
            "shipPostalCode": "10345"
        }, {
            "freight": 11.61,
            "shipCity": "Münster",
            "shipName": "Ship to 79-C",
            "orderDate": "2006-07-05 00:00:00.000000",
            "shipperId": shipper1._id,
            "custId": customer2._id,
            "employeeId": employee1._id,
            "shipRegion": null,
            "shipAddress": "Luisenstr. 9012",
            "shipCountry": "Germany",
            "shippedDate": "2006-07-10 00:00:00.000000",
            "requiredDate": "2006-08-16 00:00:00.000000",
            "shipPostalCode": "10328"
        }, {
            "freight": 65.83,
            "shipCity": "Rio de Janeiro",
            "shipName": "Destination SCQXA",
            "orderDate": "2006-07-08 00:00:00.000000",
            "shipperId": shipper1._id,
            "custId": customer3._id,
            "employeeId": employee1._id,
            "shipRegion": "RJ",
            "shipAddress": "Rua do Paço, 7890",
            "shipCountry": "Brazil",
            "shippedDate": "2006-07-12 00:00:00.000000",
            "requiredDate": "2006-08-05 00:00:00.000000",
            "shipPostalCode": "10195"
        }, {
            "freight": 41.34,
            "shipCity": "Lyon",
            "shipName": "Ship to 84-A",
            "orderDate": "2006-07-08 00:00:00.000000",
            "shipperId": shipper1._id,
            "custId": customer4._id,
            "employeeId": employee1._id,
            "shipRegion": null,
            "shipAddress": "3456, rue du Commerce",
            "shipCountry": "France",
            "shippedDate": "2006-07-15 00:00:00.000000",
            "requiredDate": "2006-08-05 00:00:00.000000",
            "shipPostalCode": "10342"
        }, {
            "freight": 51.30,
            "shipCity": "Charleroi",
            "shipName": "Ship to 76-B",
            "orderDate": "2006-07-09 00:00:00.000000",
            "shipperId": shipper2._id,
            "custId": customer5._id,
            "employeeId": employee2._id,
            "shipRegion": null,
            "shipAddress": "Boulevard Tirou, 9012",
            "shipCountry": "Belgium",
            "shippedDate": "2006-07-11 00:00:00.000000",
            "requiredDate": "2006-08-06 00:00:00.000000",
            "shipPostalCode": "10318"
        }, {
            "freight": 58.17,
            "shipCity": "Rio de Janeiro",
            "shipName": "Destination JPAIY",
            "orderDate": "2006-07-10 00:00:00.000000",
            "shipperId": shipper2._id,
            "custId": customer6._id,
            "employeeId": employee2._id,
            "shipRegion": "RJ",
            "shipAddress": "Rua do Paço, 8901",
            "shipCountry": "Brazil",
            "shippedDate": "2006-07-16 00:00:00.000000",
            "requiredDate": "2006-07-24 00:00:00.000000",
            "shipPostalCode": "10196"
        }, {
            "freight": 22.98,
            "shipCity": "Bern",
            "shipName": "Destination YUJRD",
            "orderDate": "2006-07-11 00:00:00.000000",
            "shipperId": shipper2._id,
            "custId": customer5._id,
            "employeeId": employee2._id,
            "shipRegion": null,
            "shipAddress": "Hauptstr. 1234",
            "shipCountry": "Switzerland",
            "shippedDate": "2006-07-23 00:00:00.000000",
            "requiredDate": "2006-08-08 00:00:00.000000",
            "shipPostalCode": "10139"
        }, {
            "freight": 148.33,
            "shipCity": "Genève",
            "shipName": "Ship to 68-A",
            "orderDate": "2006-07-12 00:00:00.000000",
            "shipperId": shipper2._id,
            "custId": customer7._id,
            "employeeId": employee3._id,
            "shipRegion": null,
            "shipAddress": "Starenweg 6789",
            "shipCountry": "Switzerland",
            "shippedDate": "2006-07-15 00:00:00.000000",
            "requiredDate": "2006-08-09 00:00:00.000000",
            "shipPostalCode": "10294"
        }, {
            "freight": 13.97,
            "shipCity": "Resende",
            "shipName": "Ship to 88-B",
            "orderDate": "2006-07-15 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer8._id,
            "employeeId": employee3._id,
            "shipRegion": "SP",
            "shipAddress": "Rua do Mercado, 5678",
            "shipCountry": "Brazil",
            "shippedDate": "2006-07-17 00:00:00.000000",
            "requiredDate": "2006-08-12 00:00:00.000000",
            "shipPostalCode": "10354"
        }, {
            "freight": 81.91,
            "shipCity": "San Cristóbal",
            "shipName": "Destination JYDLM",
            "orderDate": "2006-07-16 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer9._id,
            "employeeId": employee4._id,
            "shipRegion": "Táchira",
            "shipAddress": "Carrera1234 con Ave. Carlos Soublette #8-35",
            "shipCountry": "Venezuela",
            "shippedDate": "2006-07-22 00:00:00.000000",
            "requiredDate": "2006-08-13 00:00:00.000000",
            "shipPostalCode": "10199"
        }, {
            "freight": 140.51,
            "shipCity": "Graz",
            "shipName": "Destination RVDMF",
            "orderDate": "2006-07-17 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer10._id,
            "employeeId": employee4._id,
            "shipRegion": null,
            "shipAddress": "Kirchgasse 9012",
            "shipCountry": "Austria",
            "shippedDate": "2006-07-23 00:00:00.000000",
            "requiredDate": "2006-08-14 00:00:00.000000",
            "shipPostalCode": "10157"
        }, {
            "freight": 3.25,
            "shipCity": "México D.F.",
            "shipName": "Destination LGGCH",
            "orderDate": "2006-07-18 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer10._id,
            "employeeId": employee5._id,
            "shipRegion": null,
            "shipAddress": "Sierras de Granada 9012",
            "shipCountry": "Mexico",
            "shippedDate": "2006-07-25 00:00:00.000000",
            "requiredDate": "2006-08-15 00:00:00.000000",
            "shipPostalCode": "10137"
        }, {
            "freight": 55.09,
            "shipCity": "Köln",
            "shipName": "Ship to 56-A",
            "orderDate": "2006-07-19 00:00:00.000000",
           "shipperId": shipper1._id,
            "custId": customer10._id,
            "employeeId": employee5._id,
            "shipRegion": null,
            "shipAddress": "Mehrheimerstr. 0123",
            "shipCountry": "Germany",
            "shippedDate": "2006-07-29 00:00:00.000000",
            "requiredDate": "2006-08-16 00:00:00.000000",
            "shipPostalCode": "10258"
        }, {
            "freight": 3.05,
            "shipCity": "Rio de Janeiro",
            "shipName": "Ship to 61-B",
            "orderDate": "2006-07-19 00:00:00.000000",
            "shipperId": shipper2._id,
            "custId": customer10._id,
            "employeeId": employee5._id,
            "shipRegion": "RJ",
            "shipAddress": "Rua da Panificadora, 6789",
            "shipCountry": "Brazil",
            "shippedDate": "2006-07-30 00:00:00.000000",
            "requiredDate": "2006-08-16 00:00:00.000000",
            "shipPostalCode": "10274"
        }, {
            "freight": 48.29,
            "shipCity": "Albuquerque",
            "shipName": "Ship to 65-B",
            "orderDate": "2006-07-22 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer10._id,
            "employeeId": employee5._id,
            "shipRegion": "NM",
            "shipAddress": "8901 Milton Dr.",
            "shipCountry": "USA",
            "shippedDate": "2006-07-25 00:00:00.000000",
            "requiredDate": "2006-08-19 00:00:00.000000",
            "shipPostalCode": "10286"
        }, {
            "freight": 146.06,
            "shipCity": "Graz",
            "shipName": "Destination FFXKT",
            "orderDate": "2006-07-23 00:00:00.000000",
           "shipperId": shipper3._id,
            "custId": customer1._id,
            "employeeId": employee5._id,
            "shipRegion": null,
            "shipAddress": "Kirchgasse 0123",
            "shipCountry": "Austria",
            "shippedDate": "2006-07-31 00:00:00.000000",
            "requiredDate": "2006-08-20 00:00:00.000000",
            "shipPostalCode": "10158"
        }, {
            "freight": 3.67,
            "shipCity": "Bräcke",
            "shipName": "Destination KBSBN",
            "orderDate": "2006-07-24 00:00:00.000000",
           "shipperId": shipper3._id,
            "custId": customer2._id,
            "employeeId": employee5._id,
            "shipRegion": null,
            "shipAddress": "Åkergatan 9012",
            "shipCountry": "Sweden",
            "shippedDate": "2006-08-23 00:00:00.000000",
            "requiredDate": "2006-08-21 00:00:00.000000",
            "shipPostalCode": "10167"
        }, {
            "freight": 55.28,
            "shipCity": "Strasbourg",
            "shipName": "Ship to 7-A",
            "orderDate": "2006-07-25 00:00:00.000000",
           "shipperId": shipper3._id,
            "custId": customer3._id,
            "employeeId": employee3._id,
            "shipRegion": null,
            "shipAddress": "0123, place Kléber",
            "shipCountry": "France",
            "shippedDate": "2006-08-12 00:00:00.000000",
            "requiredDate": "2006-08-22 00:00:00.000000",
            "shipPostalCode": "10329"
        }, {
            "freight": 25.73,
            "shipCity": "Oulu",
            "shipName": "Ship to 87-B",
            "orderDate": "2006-07-26 00:00:00.000000",
           "shipperId": shipper3._id,
            "custId": customer3._id,
            "employeeId": employee3._id,
            "shipRegion": null,
            "shipAddress": "Torikatu 2345",
            "shipCountry": "Finland",
            "shippedDate": "2006-07-31 00:00:00.000000",
            "requiredDate": "2006-09-06 00:00:00.000000",
            "shipPostalCode": "10351"
        }, {
            "freight": 208.58,
            "shipCity": "München",
            "shipName": "Destination VAPXU",
            "orderDate": "2006-07-29 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer3._id,
            "employeeId": employee3._id,
            "shipRegion": null,
            "shipAddress": "Berliner Platz 0123",
            "shipCountry": "Germany",
            "shippedDate": "2006-08-06 00:00:00.000000",
            "requiredDate": "2006-08-26 00:00:00.000000",
            "shipPostalCode": "10168"
        }, {
            "freight": 66.29,
            "shipCity": "Caracas",
            "shipName": "Destination QJVQH",
            "orderDate": "2006-07-30 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer3._id,
            "employeeId": employee3._id,
            "shipRegion": "DF",
            "shipAddress": "5ª Ave. Los Palos Grandes 5678",
            "shipCountry": "Venezuela",
            "shippedDate": "2006-08-02 00:00:00.000000",
            "requiredDate": "2006-08-27 00:00:00.000000",
            "shipPostalCode": "10193"
        }, {
            "freight": 4.56,
            "shipCity": "Seattle",
            "shipName": "Ship to 89-B",
            "orderDate": "2006-07-31 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer4._id,
            "employeeId": employee1._id,
            "shipRegion": "WA",
            "shipAddress": "8901 - 12th Ave. S.",
            "shipCountry": "USA",
            "shippedDate": "2006-08-09 00:00:00.000000",
            "requiredDate": "2006-08-14 00:00:00.000000",
            "shipPostalCode": "10357"
        }, {
            "freight": 136.54,
            "shipCity": "Oulu",
            "shipName": "Ship to 87-B",
            "orderDate": "2006-08-01 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer4._id,
            "employeeId": employee1._id,
            "shipRegion": null,
            "shipAddress": "Torikatu 2345",
            "shipCountry": "Finland",
            "shippedDate": "2006-08-02 00:00:00.000000",
            "requiredDate": "2006-08-29 00:00:00.000000",
            "shipPostalCode": "10351"
        }, {
            "freight": 4.54,
            "shipCity": "Lander",
            "shipName": "Ship to 75-C",
            "orderDate": "2006-08-01 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer4._id,
            "employeeId": employee1._id,
            "shipRegion": "WY",
            "shipAddress": "P.O. Box 7890",
            "shipCountry": "USA",
            "shippedDate": "2006-08-30 00:00:00.000000",
            "requiredDate": "2006-08-29 00:00:00.000000",
            "shipPostalCode": "10316"
        }, {
            "freight": 98.03,
            "shipCity": "Albuquerque",
            "shipName": "Ship to 65-A",
            "orderDate": "2006-08-02 00:00:00.000000",
            "shipperId": shipper3._id,
            "custId": customer5._id,
            "employeeId": employee1._id,
            "shipRegion": "NM",
            "shipAddress": "7890 Milton Dr.",
            "shipCountry": "USA",
            "shippedDate": "2006-08-06 00:00:00.000000",
            "requiredDate": "2006-08-30 00:00:00.000000",
            "shipPostalCode": "10285"
        }]);



print("Data has been written to the collections");
