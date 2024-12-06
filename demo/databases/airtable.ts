import 'dotenv/config'
import { Logger } from '../../src/helpers/Logger'
import axios from 'axios'

// Data
const Customers = require('./json/Customer.json')
const Employees = require('./json/Employee.json')
const Shippers = require('./json/Shipper.json')

const ENDPOINT = 'https://api.airtable.com/v0'
const AIRTABLE = process.env.DATABASE_URI as string
const DOMAIN = 'AIRTABLE'
const [apiKey, baseId] = AIRTABLE.split('://')[1].split('@')
const logger = new Logger()

const buildUsers = async () => {
	const table = 'User'

	const tableRequest = {
		method: 'POST',
		url: `${ENDPOINT}/meta/bases/${baseId}/tables`,
		data: {
			name: table,
			fields: [
				{ name: 'userId', type: 'number', options: { precision: 0 } },
				{ name: 'email', type: 'email' },
				{ name: 'password', type: 'singleLineText' },
				{
					name: 'role',
					type: 'singleSelect',
					options: {
						choices: [
							{
								name: 'ADMIN',
							},
							{
								name: 'USER',
							},
						],
					},
				},
				{ name: 'firstName', type: 'singleLineText' },
				{ name: 'lastName', type: 'singleLineText' },
			],
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	const recordsRequest = {
		method: 'POST',
		url: `${ENDPOINT}/${baseId}/${table}`,
		data: {
			records: [
				{
					fields: {
						userId: 1,
						email: 'test@test.com',
						password: '$2a$10$jm6bM7acpRa18Vdy8FSqIu4yzWAdSgZgRtRrx8zknIeZhSqPJjJU.',
						role: 'ADMIN',
						firstName: 'Jon',
						lastName: 'Doe',
					},
				},
			],
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	return await build(table, tableRequest, recordsRequest)
}

const buildCustomers = async () => {
	const table = 'Customer'

	const fields = Object.keys(Customers[0])
		.map(field => {
			return field !== 'custId' ? { name: field, type: 'singleLineText' } : null
		})
		.filter(field => field !== null)

	const tableRequest = {
		method: 'POST',
		url: `${ENDPOINT}/meta/bases/${baseId}/tables`,
		data: {
			name: table,
			fields: [{ name: 'custId', type: 'number', options: { precision: 0 } }, ...fields],
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	const recordsRequest = {
		method: 'POST',
		url: `${ENDPOINT}/${baseId}/${table}`,
		data: {
			records: Customers.map(customer => {
				return { fields: customer }
			}),
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	return await build(table, tableRequest, recordsRequest)
}

const buildEmployees = async () => {
	const table = 'Employee'
	const fields = Object.keys(Employees[0])
		.map(field => {
			return field !== 'employeeId' ? { name: field, type: 'singleLineText' } : null
		})
		.filter(field => field !== null)

	const tableRequest = {
		method: 'POST',
		url: `${ENDPOINT}/meta/bases/${baseId}/tables`,
		data: {
			name: table,
			fields: [{ name: 'employeeId', type: 'number', options: { precision: 0 } }, ...fields],
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	const recordsRequest = {
		method: 'POST',
		url: `${ENDPOINT}/${baseId}/${table}`,
		data: {
			records: Employees.map(employee => {
				return { fields: employee }
			}),
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	return await build(table, tableRequest, recordsRequest)
}

const buildShippers = async () => {
	const table = 'Shipper'
	const fields = Object.keys(Shippers[0])
		.map(field => {
			return field !== 'shipperId' ? { name: field, type: 'singleLineText' } : null
		})
		.filter(field => field !== null)

	const tableRequest = {
		method: 'POST',
		url: `${ENDPOINT}/meta/bases/${baseId}/tables`,
		data: {
			name: table,
			fields: [{ name: 'shipperId', type: 'number', options: { precision: 0 } }, ...fields],
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	const recordsRequest = {
		method: 'POST',
		url: `${ENDPOINT}/${baseId}/${table}`,
		data: {
			records: Shippers.map(shipper => {
				return { fields: shipper }
			}),
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	return await build(table, tableRequest, recordsRequest)
}

const buildSalesOrders = async (shipperTable, customerTable, employeeTable) => {
	const table = 'SalesOrder'

	let timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'client'
	if (timeZone === 'UTC') {
		timeZone = 'utc'
	}

	const tableRequest = {
		method: 'POST',
		url: `${ENDPOINT}/meta/bases/${baseId}/tables`,
		data: {
			name: table,
			fields: [
				{ name: 'orderId', type: 'number', options: { precision: 0 } },
				{ name: 'freight', type: 'number', options: { precision: 2 } },
				{ name: 'shipCity', type: 'singleLineText' },
				{ name: 'shipName', type: 'singleLineText' },
				{
					name: 'orderDate',
					type: 'dateTime',
					options: {
						timeZone,
						dateFormat: {
							format: 'YYYY-MM-DD',
							name: 'iso',
						},
						timeFormat: {
							format: 'HH:mm',
							name: '24hour',
						},
					},
				},
				{ name: 'shipperId', type: 'multipleRecordLinks', options: { linkedTableId: shipperTable.id } },
				{ name: 'custId', type: 'multipleRecordLinks', options: { linkedTableId: customerTable.id } },
				{ name: 'employeeId', type: 'multipleRecordLinks', options: { linkedTableId: employeeTable.id } },
				{ name: 'shipRegion', type: 'singleLineText' },
				{ name: 'shipAddress', type: 'singleLineText' },
				{ name: 'shipCountry', type: 'singleLineText' },
				{ name: 'shipPostalCode', type: 'singleLineText' },
				{
					name: 'shippedDate',
					type: 'dateTime',
					options: {
						timeZone,
						dateFormat: {
							format: 'YYYY-MM-DD',
							name: 'iso',
						},
						timeFormat: {
							format: 'HH:mm',
							name: '24hour',
						},
					},
				},
				{
					name: 'requiredDate',
					type: 'dateTime',
					options: {
						timeZone,
						dateFormat: {
							format: 'YYYY-MM-DD',
							name: 'iso',
						},
						timeFormat: {
							format: 'HH:mm',
							name: '24hour',
						},
					},
				},
			],
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	const recordsRequest = {
		method: 'POST',
		url: `${ENDPOINT}/${baseId}/${table}`,
		data: {
			records: [
				{
					fields: {
						orderId: 1,
						freight: 32.38,
						shipCity: 'Reims',
						shipName: 'Ship to 85-B',
						orderDate: '2006-07-04 00:00:00.000000',
						shipperId: [shipperTable.records[0].id],
						custId: [customerTable.records[0].id],
						employeeId: [employeeTable.records[0].id],
						shipRegion: null,
						shipAddress: "6789 rue de l'Abbaye",
						shipCountry: 'France',
						shippedDate: '2006-07-16 00:00:00.000000',
						requiredDate: '2006-08-01 00:00:00.000000',
						shipPostalCode: '10345',
					},
				},
				{
					fields: {
						orderId: 2,
						freight: 11.61,
						shipCity: 'Münster',
						shipName: 'Ship to 79-C',
						orderDate: '2006-07-05 00:00:00.000000',
						shipperId: [shipperTable.records[0].id],
						custId: [customerTable.records[1].id],
						employeeId: [employeeTable.records[0].id],
						shipRegion: null,
						shipAddress: 'Luisenstr. 9012',
						shipCountry: 'Germany',
						shippedDate: '2006-07-10 00:00:00.000000',
						requiredDate: '2006-08-16 00:00:00.000000',
						shipPostalCode: '10328',
					},
				},
				{
					fields: {
						orderId: 3,
						freight: 65.83,
						shipCity: 'Rio de Janeiro',
						shipName: 'Destination SCQXA',
						orderDate: '2006-07-08 00:00:00.000000',
						shipperId: [shipperTable.records[0].id],
						custId: [customerTable.records[2].id],
						employeeId: [employeeTable.records[0].id],
						shipRegion: 'RJ',
						shipAddress: 'Rua do Paço, 7890',
						shipCountry: 'Brazil',
						shippedDate: '2006-07-12 00:00:00.000000',
						requiredDate: '2006-08-05 00:00:00.000000',
						shipPostalCode: '10195',
					},
				},
				{
					fields: {
						orderId: 4,
						freight: 41.34,
						shipCity: 'Lyon',
						shipName: 'Ship to 84-A',
						orderDate: '2006-07-08 00:00:00.000000',
						shipperId: [shipperTable.records[0].id],
						custId: [customerTable.records[3].id],
						employeeId: [employeeTable.records[0].id],
						shipRegion: null,
						shipAddress: '3456, rue du Commerce',
						shipCountry: 'France',
						shippedDate: '2006-07-15 00:00:00.000000',
						requiredDate: '2006-08-05 00:00:00.000000',
						shipPostalCode: '10342',
					},
				},
				{
					fields: {
						orderId: 5,
						freight: 51.3,
						shipCity: 'Charleroi',
						shipName: 'Ship to 76-B',
						orderDate: '2006-07-09 00:00:00.000000',
						shipperId: [shipperTable.records[1].id],
						custId: [customerTable.records[4].id],
						employeeId: [employeeTable.records[1].id],
						shipRegion: null,
						shipAddress: 'Boulevard Tirou, 9012',
						shipCountry: 'Belgium',
						shippedDate: '2006-07-11 00:00:00.000000',
						requiredDate: '2006-08-06 00:00:00.000000',
						shipPostalCode: '10318',
					},
				},
				{
					fields: {
						orderId: 6,
						freight: 58.17,
						shipCity: 'Rio de Janeiro',
						shipName: 'Destination JPAIY',
						orderDate: '2006-07-10 00:00:00.000000',
						shipperId: [shipperTable.records[1].id],
						custId: [customerTable.records[5].id],
						employeeId: [employeeTable.records[1].id],
						shipRegion: 'RJ',
						shipAddress: 'Rua do Paço, 8901',
						shipCountry: 'Brazil',
						shippedDate: '2006-07-16 00:00:00.000000',
						requiredDate: '2006-07-24 00:00:00.000000',
						shipPostalCode: '10196',
					},
				},
				{
					fields: {
						orderId: 7,
						freight: 22.98,
						shipCity: 'Bern',
						shipName: 'Destination YUJRD',
						orderDate: '2006-07-11 00:00:00.000000',
						shipperId: [shipperTable.records[1].id],
						custId: [customerTable.records[4].id],
						employeeId: [employeeTable.records[1].id],
						shipRegion: null,
						shipAddress: 'Hauptstr. 1234',
						shipCountry: 'Switzerland',
						shippedDate: '2006-07-23 00:00:00.000000',
						requiredDate: '2006-08-08 00:00:00.000000',
						shipPostalCode: '10139',
					},
				},
				{
					fields: {
						orderId: 8,
						freight: 148.33,
						shipCity: 'Genève',
						shipName: 'Ship to 68-A',
						orderDate: '2006-07-12 00:00:00.000000',
						shipperId: [shipperTable.records[1].id],
						custId: [customerTable.records[6].id],
						employeeId: [employeeTable.records[2].id],
						shipRegion: null,
						shipAddress: 'Starenweg 6789',
						shipCountry: 'Switzerland',
						shippedDate: '2006-07-15 00:00:00.000000',
						requiredDate: '2006-08-09 00:00:00.000000',
						shipPostalCode: '10294',
					},
				},
				{
					fields: {
						orderId: 9,
						freight: 13.97,
						shipCity: 'Resende',
						shipName: 'Ship to 88-B',
						orderDate: '2006-07-15 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[7].id],
						employeeId: [employeeTable.records[2].id],
						shipRegion: 'SP',
						shipAddress: 'Rua do Mercado, 5678',
						shipCountry: 'Brazil',
						shippedDate: '2006-07-17 00:00:00.000000',
						requiredDate: '2006-08-12 00:00:00.000000',
						shipPostalCode: '10354',
					},
				},
				{
					fields: {
						orderId: 10,
						freight: 81.91,
						shipCity: 'San Cristóbal',
						shipName: 'Destination JYDLM',
						orderDate: '2006-07-16 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[8].id],
						employeeId: [employeeTable.records[3].id],
						shipRegion: 'Táchira',
						shipAddress: 'Carrera1234 con Ave. Carlos Soublette #8-35',
						shipCountry: 'Venezuela',
						shippedDate: '2006-07-22 00:00:00.000000',
						requiredDate: '2006-08-13 00:00:00.000000',
						shipPostalCode: '10199',
					},
				},
				{
					fields: {
						orderId: 11,
						freight: 140.51,
						shipCity: 'Graz',
						shipName: 'Destination RVDMF',
						orderDate: '2006-07-17 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[9].id],
						employeeId: [employeeTable.records[3].id],
						shipRegion: null,
						shipAddress: 'Kirchgasse 9012',
						shipCountry: 'Austria',
						shippedDate: '2006-07-23 00:00:00.000000',
						requiredDate: '2006-08-14 00:00:00.000000',
						shipPostalCode: '10157',
					},
				},
				{
					fields: {
						orderId: 12,
						freight: 3.25,
						shipCity: 'México D.F.',
						shipName: 'Destination LGGCH',
						orderDate: '2006-07-18 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[9].id],
						employeeId: [employeeTable.records[4].id],
						shipRegion: null,
						shipAddress: 'Sierras de Granada 9012',
						shipCountry: 'Mexico',
						shippedDate: '2006-07-25 00:00:00.000000',
						requiredDate: '2006-08-15 00:00:00.000000',
						shipPostalCode: '10137',
					},
				},
				{
					fields: {
						orderId: 13,
						freight: 55.09,
						shipCity: 'Köln',
						shipName: 'Ship to 56-A',
						orderDate: '2006-07-19 00:00:00.000000',
						shipperId: [shipperTable.records[0].id],
						custId: [customerTable.records[9].id],
						employeeId: [employeeTable.records[4].id],
						shipRegion: null,
						shipAddress: 'Mehrheimerstr. 0123',
						shipCountry: 'Germany',
						shippedDate: '2006-07-29 00:00:00.000000',
						requiredDate: '2006-08-16 00:00:00.000000',
						shipPostalCode: '10258',
					},
				},
				{
					fields: {
						orderId: 14,
						freight: 3.05,
						shipCity: 'Rio de Janeiro',
						shipName: 'Ship to 61-B',
						orderDate: '2006-07-19 00:00:00.000000',
						shipperId: [shipperTable.records[1].id],
						custId: [customerTable.records[9].id],
						employeeId: [employeeTable.records[4].id],
						shipRegion: 'RJ',
						shipAddress: 'Rua da Panificadora, 6789',
						shipCountry: 'Brazil',
						shippedDate: '2006-07-30 00:00:00.000000',
						requiredDate: '2006-08-16 00:00:00.000000',
						shipPostalCode: '10274',
					},
				},
				{
					fields: {
						orderId: 15,
						freight: 48.29,
						shipCity: 'Albuquerque',
						shipName: 'Ship to 65-B',
						orderDate: '2006-07-22 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[9].id],
						employeeId: [employeeTable.records[4].id],
						shipRegion: 'NM',
						shipAddress: '8901 Milton Dr.',
						shipCountry: 'USA',
						shippedDate: '2006-07-25 00:00:00.000000',
						requiredDate: '2006-08-19 00:00:00.000000',
						shipPostalCode: '10286',
					},
				},
				{
					fields: {
						orderId: 16,
						freight: 146.06,
						shipCity: 'Graz',
						shipName: 'Destination FFXKT',
						orderDate: '2006-07-23 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[0].id],
						employeeId: [employeeTable.records[4].id],
						shipRegion: null,
						shipAddress: 'Kirchgasse 0123',
						shipCountry: 'Austria',
						shippedDate: '2006-07-31 00:00:00.000000',
						requiredDate: '2006-08-20 00:00:00.000000',
						shipPostalCode: '10158',
					},
				},
				{
					fields: {
						orderId: 17,
						freight: 3.67,
						shipCity: 'Bräcke',
						shipName: 'Destination KBSBN',
						orderDate: '2006-07-24 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[1].id],
						employeeId: [employeeTable.records[4].id],
						shipRegion: null,
						shipAddress: 'Åkergatan 9012',
						shipCountry: 'Sweden',
						shippedDate: '2006-08-23 00:00:00.000000',
						requiredDate: '2006-08-21 00:00:00.000000',
						shipPostalCode: '10167',
					},
				},
				{
					fields: {
						orderId: 18,
						freight: 55.28,
						shipCity: 'Strasbourg',
						shipName: 'Ship to 7-A',
						orderDate: '2006-07-25 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[2].id],
						employeeId: [employeeTable.records[2].id],
						shipRegion: null,
						shipAddress: '0123, place Kléber',
						shipCountry: 'France',
						shippedDate: '2006-08-12 00:00:00.000000',
						requiredDate: '2006-08-22 00:00:00.000000',
						shipPostalCode: '10329',
					},
				},
				{
					fields: {
						orderId: 19,
						freight: 25.73,
						shipCity: 'Oulu',
						shipName: 'Ship to 87-B',
						orderDate: '2006-07-26 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[2].id],
						employeeId: [employeeTable.records[2].id],
						shipRegion: null,
						shipAddress: 'Torikatu 2345',
						shipCountry: 'Finland',
						shippedDate: '2006-07-31 00:00:00.000000',
						requiredDate: '2006-09-06 00:00:00.000000',
						shipPostalCode: '10351',
					},
				},
				{
					fields: {
						orderId: 20,
						freight: 208.58,
						shipCity: 'München',
						shipName: 'Destination VAPXU',
						orderDate: '2006-07-29 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[2].id],
						employeeId: [employeeTable.records[2].id],
						shipRegion: null,
						shipAddress: 'Berliner Platz 0123',
						shipCountry: 'Germany',
						shippedDate: '2006-08-06 00:00:00.000000',
						requiredDate: '2006-08-26 00:00:00.000000',
						shipPostalCode: '10168',
					},
				},
				{
					fields: {
						orderId: 21,
						freight: 66.29,
						shipCity: 'Caracas',
						shipName: 'Destination QJVQH',
						orderDate: '2006-07-30 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[2].id],
						employeeId: [employeeTable.records[2].id],
						shipRegion: 'DF',
						shipAddress: '5ª Ave. Los Palos Grandes 5678',
						shipCountry: 'Venezuela',
						shippedDate: '2006-08-02 00:00:00.000000',
						requiredDate: '2006-08-27 00:00:00.000000',
						shipPostalCode: '10193',
					},
				},
				{
					fields: {
						orderId: 22,
						freight: 4.56,
						shipCity: 'Seattle',
						shipName: 'Ship to 89-B',
						orderDate: '2006-07-31 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[3].id],
						employeeId: [employeeTable.records[0].id],
						shipRegion: 'WA',
						shipAddress: '8901 - 12th Ave. S.',
						shipCountry: 'USA',
						shippedDate: '2006-08-09 00:00:00.000000',
						requiredDate: '2006-08-14 00:00:00.000000',
						shipPostalCode: '10357',
					},
				},
				{
					fields: {
						orderId: 23,
						freight: 136.54,
						shipCity: 'Oulu',
						shipName: 'Ship to 87-B',
						orderDate: '2006-08-01 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[3].id],
						employeeId: [employeeTable.records[0].id],
						shipRegion: null,
						shipAddress: 'Torikatu 2345',
						shipCountry: 'Finland',
						shippedDate: '2006-08-02 00:00:00.000000',
						requiredDate: '2006-08-29 00:00:00.000000',
						shipPostalCode: '10351',
					},
				},
				{
					fields: {
						orderId: 24,
						freight: 4.54,
						shipCity: 'Lander',
						shipName: 'Ship to 75-C',
						orderDate: '2006-08-01 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[3].id],
						employeeId: [employeeTable.records[0].id],
						shipRegion: 'WY',
						shipAddress: 'P.O. Box 7890',
						shipCountry: 'USA',
						shippedDate: '2006-08-30 00:00:00.000000',
						requiredDate: '2006-08-29 00:00:00.000000',
						shipPostalCode: '10316',
					},
				},
				{
					fields: {
						orderId: 25,
						freight: 98.03,
						shipCity: 'Albuquerque',
						shipName: 'Ship to 65-A',
						orderDate: '2006-08-02 00:00:00.000000',
						shipperId: [shipperTable.records[2].id],
						custId: [customerTable.records[4].id],
						employeeId: [employeeTable.records[0].id],
						shipRegion: 'NM',
						shipAddress: '7890 Milton Dr.',
						shipCountry: 'USA',
						shippedDate: '2006-08-06 00:00:00.000000',
						requiredDate: '2006-08-30 00:00:00.000000',
						shipPostalCode: '10285',
					},
				},
			],
		},
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	}

	return await build(table, tableRequest, recordsRequest)
}

const build = async (
	table: string,
	tableRequest: axios.AxiosRequestConfig<any>,
	recordsRequest: axios.AxiosRequestConfig<any>,
) => {
	let tableResponse

	try {
		tableResponse = await axios(tableRequest)
		logger.log(`${table} table created (#${tableResponse.data?.id})`, DOMAIN)

		let records: any[] = []

		try {
			if (recordsRequest.data.records.length > 10) {
				const chunk = 10
				for (let i = 0; i < recordsRequest.data.records.length; i += chunk) {
					const recordsResponse = await axios({
						method: 'POST',
						url: `${ENDPOINT}/${baseId}/${table}`,
						data: {
							records: recordsRequest.data.records.slice(i, i + chunk),
						},
						headers: {
							Authorization: `Bearer ${apiKey}`,
						},
					})
					records = records.concat(recordsResponse.data?.records)
				}
			} else {
				const recordsResponse = await axios(recordsRequest)
				records = recordsResponse.data?.records
			}

			if (records.length) {
				for (const record of records) {
					logger.log(`${table} #${record.id} created`, DOMAIN)
				}
			}

			logger.log(`Seeded ${records.length} records`, DOMAIN)

			return {
				id: tableResponse.data.id,
				records,
			}
		} catch (error) {
			logger.error(`Error creating ${table} records`, DOMAIN)
			console.dir(error.response?.data, { depth: null })
			console.dir(recordsRequest, { depth: null })
			throw new Error(`Error creating ${table} records`)
		}
	} catch (error) {
		if (error.response.data.error.type === 'DUPLICATE_TABLE_NAME') {
			logger.warn(`${table} table already exists`, DOMAIN)

			const tablesResponse = await axios({
				method: 'GET',
				url: `${ENDPOINT}/meta/bases/${baseId}/tables`,
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			})

			const filteredTable = tablesResponse.data.tables.find((t: any) => t.name === table)

			const recordsResponse = await axios({
				method: 'GET',
				url: `${ENDPOINT}/${baseId}/${table}`,
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			})

			return {
				id: filteredTable.id,
				...recordsResponse.data,
			}
		} else {
			logger.error(`Error creating ${table} table`, DOMAIN)
			console.dir(error.response.data, { depth: null })
			console.dir(tableRequest, { depth: null })
			throw new Error(`Error creating ${table} table`)
		}
	}
}

const seed = async () => {
	logger.log('Seeding Airtable database', DOMAIN)

	await buildUsers()
	const customerTable = await buildCustomers()
	const employeeTable = await buildEmployees()
	const shipperTable = await buildShippers()
	await buildSalesOrders(shipperTable, customerTable, employeeTable)
}

seed()
