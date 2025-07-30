import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { Logger } from '../helpers/Logger'
import { Pagination } from '../helpers/Pagination'
import { Postgres } from './postgres.datasource'
import { MySQL } from './mysql.datasource'
import { MSSQL } from './mssql.datasource'
import { DataSourceSchema, DataSourceColumnType, DataSourceCompositeUniqueConstraint } from '../types/datasource.types'

describe('Composite Unique Constraints', () => {
	let postgresService: Postgres
	let mysqlService: MySQL
	let mssqlService: MSSQL
	let configService: ConfigService
	let logger: Logger
	let pagination: Pagination

	const mockSchema: DataSourceSchema = {
		table: 'reviews',
		primary_key: 'id',
		columns: [
			{
				field: 'id',
				type: DataSourceColumnType.NUMBER,
				nullable: false,
				required: true,
				primary_key: true,
				unique_key: true,
				foreign_key: false,
				auto_increment: true,
			},
			{
				field: 'userId',
				type: DataSourceColumnType.STRING,
				nullable: false,
				required: true,
				primary_key: false,
				unique_key: false,
				foreign_key: false,
			},
			{
				field: 'serverId',
				type: DataSourceColumnType.STRING,
				nullable: false,
				required: true,
				primary_key: false,
				unique_key: false,
				foreign_key: false,
			},
			{
				field: 'rating',
				type: DataSourceColumnType.NUMBER,
				nullable: false,
				required: true,
				primary_key: false,
				unique_key: false,
				foreign_key: false,
			},
		],
		composite_unique_constraints: [
			{
				name: 'user_server_review_unique',
				columns: ['userId', 'serverId'],
			},
		],
	}

	beforeEach(async () => {
		// Set NODE_ENV to avoid test environment early returns
		process.env.NODE_ENV = 'development'

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				Postgres,
				MySQL,
				MSSQL,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string) => {
							switch (key) {
								case 'DATABASE_URI':
									return 'postgresql://test:test@localhost:5432/test'
								default:
									return undefined
							}
						}),
					},
				},
				{
					provide: Logger,
					useValue: {
						debug: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
					},
				},
				{
					provide: Pagination,
					useValue: {
						paginate: jest.fn(),
					},
				},
			],
		}).compile()

		postgresService = module.get<Postgres>(Postgres)
		mysqlService = module.get<MySQL>(MySQL)
		mssqlService = module.get<MSSQL>(MSSQL)
		configService = module.get<ConfigService>(ConfigService)
		logger = module.get<Logger>(Logger)
		pagination = module.get<Pagination>(Pagination)
	})

	describe('PostgreSQL Composite Unique Constraints', () => {
		it('should detect composite unique constraint violation', async () => {
			// Mock the performQuery method to simulate database behavior
			const mockPerformQuery = jest.fn()
			postgresService.performQuery = mockPerformQuery

			// Since there are no individual unique columns, the first call should be for composite constraint
			// Return 1 to indicate a violation
			mockPerformQuery.mockResolvedValueOnce([{ total: 1 }]) // Composite constraint fails

			const result = await postgresService.uniqueCheck(
				{
					schema: mockSchema,
					data: {
						userId: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt',
						serverId: 'cb6111ce-e32e-4c59-96da-9058a66f88dd',
						rating: 5,
					},
				},
				'production-request-id',
			)

			expect(result.valid).toBe(false)
			expect(result.error).toContain('userId, serverId')
			expect(result.error).toContain('5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt')
			expect(result.error).toContain('cb6111ce-e32e-4c59-96da-9058a66f88dd')
		})

		it('should allow different combinations of composite constraint columns', async () => {
			const mockPerformQuery = jest.fn()
			postgresService.performQuery = mockPerformQuery

			// All queries return 0 (no violations)
			mockPerformQuery.mockResolvedValue([{ total: 0 }])

			const result = await postgresService.uniqueCheck(
				{
					schema: mockSchema,
					data: {
						userId: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt',
						serverId: 'different-server-id',
						rating: 4,
					},
				},
				'production-request-id',
			)

			expect(result.valid).toBe(true)
		})

		it('should handle updates correctly with composite constraints', async () => {
			const mockPerformQuery = jest.fn()
			postgresService.performQuery = mockPerformQuery

			// All queries return 0 (no violations)
			mockPerformQuery.mockResolvedValue([{ total: 0 }])

			const result = await postgresService.uniqueCheck(
				{
					schema: mockSchema,
					data: {
						userId: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt',
						serverId: 'cb6111ce-e32e-4c59-96da-9058a66f88dd',
						rating: 3,
					},
					id: '123', // Updating existing record
				},
				'production-request-id',
			)

			expect(result.valid).toBe(true)
			// Verify that the exclude ID clause was used
			expect(mockPerformQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					sql: expect.stringContaining('AND "id" != $3'),
					values: expect.arrayContaining(['5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt', 'cb6111ce-e32e-4c59-96da-9058a66f88dd', '123']),
				}),
			)
		})
	})

	describe('MySQL Composite Unique Constraints', () => {
		it('should detect composite unique constraint violation', async () => {
			const mockQuery = jest.fn()
			mysqlService.query = mockQuery

			// Since there are no individual unique columns, the first call should be for composite constraint
			mockQuery.mockResolvedValueOnce([{ total: 1 }]) // Composite constraint fails

			const result = await mysqlService.uniqueCheck(
				{
					schema: mockSchema,
					data: {
						userId: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt',
						serverId: 'cb6111ce-e32e-4c59-96da-9058a66f88dd',
						rating: 5,
					},
				},
				'production-request-id',
			)

			expect(result.valid).toBe(false)
			expect(result.error).toContain('userId, serverId')
		})
	})

	describe('MSSQL Composite Unique Constraints', () => {
		it('should detect composite unique constraint violation', async () => {
			const mockPerformQuery = jest.fn()
			mssqlService.performQuery = mockPerformQuery

			// Since there are no individual unique columns, the first call should be for composite constraint
			mockPerformQuery.mockResolvedValueOnce({ recordset: [{ total: 1 }] }) // Composite constraint fails

			const result = await mssqlService.uniqueCheck(
				{
					schema: mockSchema,
					data: {
						userId: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt',
						serverId: 'cb6111ce-e32e-4c59-96da-9058a66f88dd',
						rating: 5,
					},
				},
				'production-request-id',
			)

			expect(result.valid).toBe(false)
			expect(result.error).toContain('userId, serverId')
		})
	})

	describe('Schema with composite unique constraints', () => {
		it('should include composite unique constraints in schema', () => {
			expect(mockSchema.composite_unique_constraints).toBeDefined()
			expect(mockSchema.composite_unique_constraints).toHaveLength(1)
			expect(mockSchema.composite_unique_constraints[0].name).toBe('user_server_review_unique')
			expect(mockSchema.composite_unique_constraints[0].columns).toEqual(['userId', 'serverId'])
		})
	})
})
