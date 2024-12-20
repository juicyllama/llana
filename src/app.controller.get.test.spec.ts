import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from './app.module'
import { AuthTestingService } from './testing/auth.testing.service'
import { ConfigService } from '@nestjs/config'
import { AppBootup } from './app.service.bootup'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'
import { LLANA_ROLES_TABLE } from './app.constants'
import {
	DataSourceSchema,
	QueryPerform,
	WhereOperator,
	DataSourceWhere,
	DataSourceColumnType,
	DataSourceSchemaColumn,
	ListTablesResponseObject,
	FindOneResponseObject,
} from './types/datasource.types'
import { RolePermission } from './types/roles.types'

describe('App > Controller > Get', () => {
	let moduleRef: TestingModule
	let authTestingService: AuthTestingService
	let appBootup: AppBootup
	let configService: ConfigService
	let logger: Logger
	let query: Query

	beforeAll(async () => {
		moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [AuthTestingService, Logger],
		}).compile()
		authTestingService = moduleRef.get<AuthTestingService>(AuthTestingService)
		appBootup = moduleRef.get<AppBootup>(AppBootup)
		configService = moduleRef.get<ConfigService>(ConfigService)
		logger = moduleRef.get<Logger>(Logger)
		query = moduleRef.get<Query>(Query)

		// Ensure app is bootstrapped before running tests
		try {
			logger.debug('[Test Setup] Starting application bootstrap')
			await appBootup.onApplicationBootstrap()

			// Verify role table exists after bootstrap
			const tables = (await query.perform(QueryPerform.LIST_TABLES, { include_system: true })) as ListTablesResponseObject
			logger.debug(`[Test Setup] Available tables after bootstrap: ${JSON.stringify(tables.tables)}`)

			if (!tables.tables.includes(LLANA_ROLES_TABLE)) {
				logger.error(`[Test Setup] Tables found: ${tables.tables.join(', ')}`)
				throw new Error(`${LLANA_ROLES_TABLE} table not created during bootstrap`)
			}
		} catch (error) {
			logger.error('[Test Setup] Failed to bootstrap application:', error)
			throw error
		}
	})

			logger.debug('[Test Setup] Application bootstrapped successfully')
		} catch (error) {
			logger.error('[Test Setup] Failed to bootstrap application:', error)
			throw error
		}
	})

	afterAll(async () => {
		// Clean up test data but preserve system tables
		try {
			// Only clean up test records, not the table itself
			const schema: DataSourceSchema = {
				table: LLANA_ROLES_TABLE,
				primary_key: 'id',
				columns: [
					{
						field: 'role',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					} as DataSourceSchemaColumn,
				],
			}

			await query.perform(QueryPerform.DELETE, {
				schema,
				where: [
					{
						column: 'role',
						operator: WhereOperator.equals,
						value: 'ADMIN', // Preserve default roles
					} as DataSourceWhere,
				],
			})
		} catch (error) {
			logger.error('[Test Cleanup] Error cleaning up test data:', error)
		}
	})

	describe('Role-based Column Visibility', () => {
		it('should create and verify role with restricted fields', async () => {
			// Create a test role with restricted fields
			const testRole = {
				custom: true,
				role: 'TEST_ROLE',
				table: 'users',
				records: RolePermission.READ_RESTRICTED,
				restricted_fields: 'email,phone,address',
			}

			const schema: DataSourceSchema = {
				table: LLANA_ROLES_TABLE,
				primary_key: 'id',
				columns: [
					{
						field: 'custom',
						type: DataSourceColumnType.BOOLEAN,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					} as DataSourceSchemaColumn,
					{
						field: 'role',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					} as DataSourceSchemaColumn,
					{
						field: 'table',
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					} as DataSourceSchemaColumn,
					{
						field: 'records',
						type: DataSourceColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['NONE', 'READ', 'READ_RESTRICTED', 'WRITE', 'WRITE_RESTRICTED', 'DELETE'],
					} as DataSourceSchemaColumn,
					{
						field: 'restricted_fields',
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					} as DataSourceSchemaColumn,
				],
			}

			// Create the role
			const createResult = await query.perform(QueryPerform.CREATE, {
				schema,
				data: testRole,
			})

			expect(createResult).toBeTruthy()

			// Verify role was created
			const findResult = (await query.perform(QueryPerform.FIND_ONE, {
				schema,
				where: [
					{
						column: 'role',
						operator: WhereOperator.equals,
						value: testRole.role,
					} as DataSourceWhere,
				],
			})) as FindOneResponseObject

			expect(findResult).toBeTruthy()
			expect(findResult.role).toBe(testRole.role)
			expect(findResult.restricted_fields).toBe(testRole.restricted_fields)
			expect(findResult.records).toBe(testRole.records)
		})

		it('should clean up test role after verification', async () => {
			const schema: DataSourceSchema = {
				table: LLANA_ROLES_TABLE,
				primary_key: 'id',
				columns: [
					{
						field: 'role',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					} as DataSourceSchemaColumn,
					{
						field: 'custom',
						type: DataSourceColumnType.BOOLEAN,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					} as DataSourceSchemaColumn,
					{
						field: 'records',
						type: DataSourceColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['NONE', 'READ', 'READ_RESTRICTED', 'WRITE', 'WRITE_RESTRICTED', 'DELETE'],
					} as DataSourceSchemaColumn,
				],
			}

			// Delete the test role
			const deleteResult = await query.perform(QueryPerform.DELETE, {
				schema,
				where: [
					{
						column: 'role',
						operator: WhereOperator.equals,
						value: 'TEST_ROLE',
					} as DataSourceWhere,
				],
			})

			expect(deleteResult).toBeTruthy()

			// Verify role was deleted
			const findResult = await query.perform(QueryPerform.FIND_ONE, {
				schema,
				where: [
					{
						column: 'role',
						operator: WhereOperator.equals,
						value: 'TEST_ROLE',
					} as DataSourceWhere,
				],
			})

			expect(findResult).toBeFalsy()
		})
	})
})
