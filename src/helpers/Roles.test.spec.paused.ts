import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { LLANA_ROLES_TABLE } from '../app.constants'
import { AppModule } from '../app.module'
import { CUSTOMER } from '../testing/customer.testing.service'
import { DatabaseSchema, QueryPerform } from '../types/database.types'
import { CustomRole, DefaultRole, RolePermission } from '../types/roles.types'
//import { Logger } from './Logger'
import { Query } from './Query'
//import { Roles } from './Roles'
import { Schema } from './Schema'

describe('Roles', () => {
	let app: INestApplication
	//let service: Roles
	//let logger: Logger
	let query: Query
	let schema: Schema

	let llanaRolesTableSchema: DatabaseSchema
	//let customerTableSchema: DatabaseSchema
	let role_record: DefaultRole | CustomRole

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.listen(3050)
		await app.init()

		//service = app.get<Roles>(Roles)
		schema = app.get<Schema>(Schema)
		//logger = app.get<Logger>(Logger)
		query = app.get<Query>(Query)

		llanaRolesTableSchema = await schema.getSchema({table: LLANA_ROLES_TABLE})
		//customerTableSchema = await schema.getSchema('Customer')

		const home = await request(app.getHttpServer()).get('/').expect(200)

		console.log(home.text)
	})

	describe('No roles', () => {
		it('Full permissions for all', async function () {
			await query.truncate(LLANA_ROLES_TABLE)
			const customers = await request(app.getHttpServer())
				.get('/Customer/')
				.set('x-api-key', 'Ex@mp1eS$Cu7eAp!K3y')
				.expect(200)
			expect(customers).toBeDefined()
			expect(customers.body).toBeDefined()
			expect(customers.body.data).toBeDefined()
			expect(customers.body.data.length).toBeGreaterThan(0)
		})

		it('Update Default Access to NONE', async function () {
			role_record = (await query.perform(QueryPerform.CREATE, {
				schema: llanaRolesTableSchema,
				data: <DefaultRole>{
					custom: false,
					role: 'ADMIN',
					records: RolePermission.NONE,
				},
			})) as DefaultRole

			console.log(role_record)

			expect(role_record).toBeDefined()
			expect(role_record.id).toBeDefined()
		})

		it('No Access', async function () {
			const response = await request(app.getHttpServer())
				.post('/Customer/')
				.set('x-api-key', 'Ex@mp1eS$Cu7eAp!K3y')
				.send(CUSTOMER)

			expect(response.status).toEqual(401)
			//expect(response.body.email).toEqual('foo@bar.com');

			//Call create, expect 401
			//Call read, expect 401
			//Call update, expect 401
			//Call delete, expect 401
		})
	})

	describe('Default Roles', () => {
		it('Read Access', async function () {
			//TODO: update the default role to have read access
			//Call create, expect 401
			//Call read, expect 200
			//Call update, expect 401
			//Call delete, expect 401
		})

		it('Write Access', async function () {
			//TODO: update the default role to have write access
			//Call create, expect 201
			//Call read, expect 200
			//Call update, expect 200
			//Call delete, expect 401
		})

		it('Delete Access', async function () {
			//TODO: update the default role to have delete access
			//Call create, expect 201
			//Call read, expect 200
			//Call update, expect 200
			//Call delete, expect 200
		})
	})

	describe('Table Roles - Own Records', () => {
		it('No Access', async function () {
			//TODO: add a table role that has no access to both own records and all records
			//Own records: READ
			//Call create, expect 401
			//Call read, expect 401
			//Call update, expect 401
			//Call delete, expect 401
			//Records: NONE
			//Call create, expect 401
			//Call read, expect 401
			//Call update, expect 401
			//Call delete, expect 401
		})

		it('Read own records', async function () {
			//Own records: READ
			//Call create, expect 401
			//Call read, expect 200
			//Call update, expect 401
			//Call delete, expect 401
			//Records: NONE
			//Call create, expect 401
			//Call read, expect 401
			//Call update, expect 401
			//Call delete, expect 401
		})

		it('Write own records', async function () {
			//Own records: WRITE
			//Call create, expect 201
			//Call read, expect 200
			//Call update, expect 200
			//Call delete, expect 401
			//Records: NONE
			//Call create, expect 401
			//Call read, expect 401
			//Call update, expect 401
			//Call delete, expect 401
		})

		it('Delete own records', async function () {
			//Own records: DELETE
			//Call create, expect 201
			//Call read, expect 200
			//Call update, expect 200
			//Call delete, expect 200
			//Records: NONE
			//Call create, expect 401
			//Call read, expect 401
			//Call update, expect 401
			//Call delete, expect 401
		})
	})

	describe('Table Roles - Other Records', () => {
		it('No Access', async function () {
			//TODO: add a table role that has no access to both own records and all records
			//Records: NONE
			//Call create, expect 401
			//Call read, expect 401
			//Call update, expect 401
			//Call delete, expect 401
		})

		it('Read records', async function () {
			//Records: READ
			//Call create, expect 401
			//Call read, expect 200
			//Call update, expect 401
			//Call delete, expect 401
		})

		it('Write records', async function () {
			//records: WRITE
			//Call create, expect 201
			//Call read, expect 200
			//Call update, expect 200
			//Call delete, expect 401
		})

		it('Delete records', async function () {
			//Records: DELETE
			//Call create, expect 201
			//Call read, expect 200
			//Call update, expect 200
			//Call delete, expect 200
		})
	})

	afterEach(async () => {
		await app.close()
	})
})
