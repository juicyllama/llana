import { Test } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { ConsoleLogger } from '@nestjs/common'
import { DatabaseTestingService } from './database.testing.service'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { CustomerTestingService } from './customer.testing.service'
import { UserTestingService } from './user.testing.service'
import { DataSourceType } from '../types/datasource.types'
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

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					load: [configs],
					isGlobal: true,
				}),
				CacheModule.register(),
			],
			providers: [
				DatabaseTestingService,
				Query,
				Schema,
				CustomerTestingService,
				UserTestingService,
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
	}, TIMEOUT)

	describe('Error Generation', () => {
		it('should generate unique constraint violation error', async () => {
			const error = await databaseTestingService.createDuplicateError()
			expect(error).toBeDefined()
			expect(error.message).toContain('Database error')
			expect(error.message).toMatch(/duplicate|unique constraint/i)
		})

		it('should generate type mismatch error', async () => {
			const error = await databaseTestingService.createTypeMismatchError()
			expect(error).toBeDefined()
			expect(error.message).toContain('Database error')
			expect(error.message).toMatch(/invalid.*type|type.*mismatch/i)
		})
	})
})
