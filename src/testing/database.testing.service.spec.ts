import { Test } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { ConsoleLogger } from '@nestjs/common'
import { DatabaseTestingService } from './database.testing.service'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { CustomerTestingService } from './customer.testing.service'
import { UserTestingService } from './user.testing.service'
import { DataSourceType, DataSourceSchema, QueryPerform } from '../types/datasource.types'
import configs from '../config/database.config'
import { TIMEOUT } from './testing.const'
import { MySQL } from '../datasources/mysql.datasource'
import { MSSQL } from '../datasources/mssql.datasource'
import { Postgres } from '../datasources/postgres.datasource'
import { Mongo } from '../datasources/mongo.datasource'
import { Airtable } from '../datasources/airtable.datasource'
import { ErrorHandler } from '../helpers/ErrorHandler'
import { Encryption } from '../helpers/Encryption'
import { Logger } from '../helpers/Logger'
import { Pagination } from '../helpers/Pagination'

class TestLogger extends ConsoleLogger {
	constructor() {
		super('Llana')
	}
	error = jest.fn()
	warn = jest.fn()
	log = jest.fn()
	debug = jest.fn()
	verbose = jest.fn()
	setContext = jest.fn()
}

describe('DatabaseTestingService', () => {
	let databaseTestingService: DatabaseTestingService
	let query: Query
	let schema: Schema
	let customerTestingService: CustomerTestingService
	let customerId: string | number

	beforeAll(async () => {
		// Set test environment variables
		process.env.DATABASE_TYPE = 'mysql'
		process.env.DATABASE_HOST = 'localhost'
		process.env.DATABASE_PORT = '3306'
		process.env.DATABASE_USERNAME = 'root'
		process.env.DATABASE_PASSWORD = 'root'
		process.env.DATABASE_NAME = 'test'
		process.env.DATABASE_URI = `mysql://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`

		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					load: [configs],
					isGlobal: true,
				}),
				CacheModule.register({
					isGlobal: true,
				}),
			],
			providers: [
				DatabaseTestingService,
				CustomerTestingService,
				UserTestingService,
				Query,
				Schema,
				MySQL,
				MSSQL,
				Postgres,
				Mongo,
				Airtable,
				ErrorHandler,
				Encryption,
				{
					provide: Logger,
					useClass: TestLogger,
				},
				Pagination,
				{
					provide: 'CACHE_MANAGER',
					useValue: {
						get: () => null,
						set: () => null,
						del: () => null,
						reset: () => null,
					},
				},
			],
		}).compile()

		databaseTestingService = moduleRef.get<DatabaseTestingService>(DatabaseTestingService)
		query = moduleRef.get<Query>(Query)
		schema = moduleRef.get<Schema>(Schema)
		customerTestingService = moduleRef.get<CustomerTestingService>(CustomerTestingService)

		// Wait for database to be ready
		await new Promise(resolve => setTimeout(resolve, 1000))

		// Verify database connection before running tests
		const dbType = await databaseTestingService.getDatabaseType()
		expect(dbType).toBe(DataSourceType.MYSQL)

		// Initialize Customer schema if it doesn't exist
		const customerSchema = await schema.getSchema({ table: 'Customer' })
		if (!customerSchema) {
			throw new Error('Customer schema not found. Please ensure database is properly initialized.')
		}
	}, TIMEOUT)

	afterAll(async () => {
		// Clean up any test data
		try {
			const customerSchema = await schema.getSchema({ table: 'Customer' })
			if (customerSchema) {
				await query.perform(QueryPerform.TRUNCATE, { schema: customerSchema }, 'test-cleanup')
			}
		} catch (error) {
			console.error('Error cleaning up test data:', error)
		}
	}, TIMEOUT)

	describe('Error Generation', () => {
		let customerSchema: DataSourceSchema

		beforeEach(async () => {
			customerSchema = await schema.getSchema({ table: 'Customer' })
			if (!customerSchema) {
				throw new Error('Customer schema not found')
			}
		})

		it('should generate unique constraint violation error', async () => {
			const error = await databaseTestingService.createDuplicateError()
			expect(error).toBeDefined()
			expect(error.message).toContain('Database error')
			expect(error.message).toMatch(/duplicate|unique constraint|duplicate entry|unique violation|violation of unique|unique index/i)
		}, TIMEOUT)

		it('should generate type mismatch error', async () => {
			const error = await databaseTestingService.createTypeMismatchError()
			expect(error).toBeDefined()
			expect(error.message).toContain('Database error')
			expect(error.message).toMatch(/invalid.*type|type.*mismatch|incorrect.*type|data type|invalid input syntax|conversion failed|cannot be converted/i)
		}, TIMEOUT)
	})
})
