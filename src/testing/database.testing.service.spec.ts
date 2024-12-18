import { Test } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { DatabaseTestingService } from './database.testing.service'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { CustomerTestingService } from './customer.testing.service'
import { UserTestingService } from './user.testing.service'
import { DataSourceType } from '../types/datasource.types'
import configs from '../config/database.config'
import { TIMEOUT } from './testing.const'

describe('DatabaseTestingService', () => {
	let databaseTestingService: DatabaseTestingService

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [ConfigModule.forRoot({ load: [configs] })],
			providers: [DatabaseTestingService, Query, Schema, CustomerTestingService, UserTestingService],
		}).compile()

		databaseTestingService = moduleRef.get<DatabaseTestingService>(DatabaseTestingService)
	}, TIMEOUT)

	describe('Error Generation', () => {
		it('should generate duplicate error', async () => {
			const dbType = await databaseTestingService.getDatabaseType()
			const error = await databaseTestingService.createDuplicateError(dbType)

			expect(error).toBeDefined()
			switch (dbType) {
				case DataSourceType.POSTGRES:
					expect(error.code).toBe('23505')
					break
				case DataSourceType.MYSQL:
					expect(error.code).toBe('ER_DUP_ENTRY')
					break
				case DataSourceType.MONGODB:
					expect(error.code).toBe(11000)
					break
				case DataSourceType.MSSQL:
					expect(error.number).toBe(2627)
					break
			}
		})

		it('should generate type mismatch error', async () => {
			const dbType = await databaseTestingService.getDatabaseType()
			const error = await databaseTestingService.createTypeMismatchError(dbType)

			expect(error).toBeDefined()
			switch (dbType) {
				case DataSourceType.POSTGRES:
					expect(error.code).toBe('22P02')
					break
				case DataSourceType.MYSQL:
					expect(error.code).toBe('ER_TRUNCATED_WRONG_VALUE')
					break
				case DataSourceType.MONGODB:
					expect(error.name).toBe('CastError')
					break
				case DataSourceType.MSSQL:
					expect(error.number).toBe(8114)
					break
			}
		})
	})
})
