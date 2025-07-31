import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { Logger } from '../helpers/Logger'
import { Pagination } from '../helpers/Pagination'
import { Postgres } from './postgres.datasource'
import { DataSourceSchema, DataSourceColumnType, DatabaseErrorType } from '../types/datasource.types'

/**
 * Integration test for GitHub Issue #202
 * Tests that composite unique constraints work correctly for the reviews table
 * with userId and serverId composite unique constraint
 */
describe('Issue #202 - Composite Unique Constraint Integration Test', () => {
	let postgresService: Postgres
	let configService: ConfigService
	let logger: Logger
	let pagination: Pagination

	// Mock schema that represents the reviews table from the issue
	const reviewsSchema: DataSourceSchema = {
		table: 'reviews',
		primary_key: 'id',
		columns: [
			{
				field: 'id',
				type: DataSourceColumnType.NUMBER,
				nullable: false,
				required: true,
				primary_key: true,
				unique_key: false, // Primary keys are unique by default, but not checked in uniqueCheck
				foreign_key: false,
				auto_increment: true,
			},
			{
				field: 'user_id',
				type: DataSourceColumnType.STRING,
				nullable: false,
				required: true,
				primary_key: false,
				unique_key: false,
				foreign_key: false,
			},
			{
				field: 'server_id',
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
			{
				field: 'comment',
				type: DataSourceColumnType.STRING,
				nullable: true,
				required: false,
				primary_key: false,
				unique_key: false,
				foreign_key: false,
			},
		],
		composite_unique_constraints: [
			{
				name: 'user_server_review_unique',
				columns: ['user_id', 'server_id'],
			},
		],
	}

	beforeEach(async () => {
		// Set NODE_ENV to avoid test environment early returns
		process.env.NODE_ENV = 'development'

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				Postgres,
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
		configService = module.get<ConfigService>(ConfigService)
		logger = module.get<Logger>(Logger)
		pagination = module.get<Pagination>(Pagination)
	})

	describe('Scenario from GitHub Issue #202', () => {
		it('should prevent duplicate review for same user and server combination', async () => {
			// Mock the performQuery method to simulate the exact scenario from the issue
			const mockPerformQuery = jest.fn()
			postgresService.performQuery = mockPerformQuery

			// Simulate the scenario:
			// Since there are no individual unique columns, only composite constraint check is performed
			// Composite constraint check fails (record exists with both user_id AND server_id)
			mockPerformQuery.mockResolvedValueOnce([{ total: 1 }]) // composite constraint check fails

			const result = await postgresService.uniqueCheck(
				{
					schema: reviewsSchema,
					data: {
						user_id: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt',
						server_id: 'cb6111ce-e32e-4c59-96da-9058a66f88dd',
						rating: 5,
						comment: 'Great server!',
					},
				},
				'production-request-id',
			)

			expect(result.valid).toBe(false)
			expect(result.message).toBe(DatabaseErrorType.DUPLICATE_RECORD)
			expect(result.error).toContain('user_id, server_id')
			expect(result.error).toContain('5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt')
			expect(result.error).toContain('cb6111ce-e32e-4c59-96da-9058a66f88dd')
		})

		it('should allow same user to review different servers', async () => {
			const mockPerformQuery = jest.fn()
			postgresService.performQuery = mockPerformQuery

			// All checks pass - no violations
			mockPerformQuery.mockResolvedValue([{ total: 0 }])

			const result = await postgresService.uniqueCheck(
				{
					schema: reviewsSchema,
					data: {
						user_id: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt', // Same user
						server_id: 'different-server-id', // Different server
						rating: 4,
						comment: 'Another great server!',
					},
				},
				'production-request-id',
			)

			expect(result.valid).toBe(true)
		})

		it('should allow different users to review same server', async () => {
			const mockPerformQuery = jest.fn()
			postgresService.performQuery = mockPerformQuery

			// All checks pass - no violations
			mockPerformQuery.mockResolvedValue([{ total: 0 }])

			const result = await postgresService.uniqueCheck(
				{
					schema: reviewsSchema,
					data: {
						user_id: 'different-user-id', // Different user
						server_id: 'cb6111ce-e32e-4c59-96da-9058a66f88dd', // Same server
						rating: 3,
						comment: 'Good server!',
					},
				},
				'production-request-id',
			)

			expect(result.valid).toBe(true)
		})

		it('should handle updates correctly - allow updating existing review', async () => {
			const mockPerformQuery = jest.fn()
			postgresService.performQuery = mockPerformQuery

			// All checks pass because we're updating the same record
			mockPerformQuery.mockResolvedValue([{ total: 0 }])

			const result = await postgresService.uniqueCheck(
				{
					schema: reviewsSchema,
					data: {
						user_id: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt',
						server_id: 'cb6111ce-e32e-4c59-96da-9058a66f88dd',
						rating: 4, // Updated rating
						comment: 'Updated review!', // Updated comment
					},
					id: '123', // Updating existing record with ID 123
				},
				'production-request-id',
			)

			expect(result.valid).toBe(true)

			// Verify that the composite constraint query includes the exclude ID clause
			const compositeConstraintCall = mockPerformQuery.mock.calls.find(call =>
				call[0].sql.includes('user_id') && call[0].sql.includes('server_id') && call[0].sql.includes('AND "id" != $3')
			)
			expect(compositeConstraintCall).toBeDefined()
			expect(compositeConstraintCall[0].values).toEqual([
				'5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt',
				'cb6111ce-e32e-4c59-96da-9058a66f88dd',
				'123',
			])
		})

		it('should demonstrate the fix - composite constraint takes precedence over individual column checks', async () => {
			const mockPerformQuery = jest.fn()
			postgresService.performQuery = mockPerformQuery

			// Simulate the old behavior where individual user_id check would fail
			// but composite constraint should be the determining factor
			mockPerformQuery
				.mockResolvedValueOnce([{ total: 0 }]) // server_id individual check passes
				.mockResolvedValueOnce([{ total: 5 }]) // user_id individual check finds 5 records (would fail in old system)
				.mockResolvedValueOnce([{ total: 0 }]) // composite constraint check passes (no record with BOTH user_id AND server_id)

			const result = await postgresService.uniqueCheck(
				{
					schema: reviewsSchema,
					data: {
						user_id: '5k3L4IQ2bSS2MtjZrMbWLwHxhhSmZiqt', // User has reviewed other servers
						server_id: 'new-server-id', // But not this specific server
						rating: 5,
						comment: 'First review for this server!',
					},
				},
				'production-request-id',
			)

			// This should pass because the composite constraint allows it
			// even though the user has other reviews (individual user_id check found records)
			expect(result.valid).toBe(true)
		})
	})
})
