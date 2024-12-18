import { Test } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { ErrorHandler } from './ErrorHandler'
import { DataSourceType } from '../types/datasource.types'
import configs from '../config/database.config'
import { TIMEOUT } from '../testing/testing.const'

describe('ErrorHandler', () => {
	let errorHandler: ErrorHandler

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [ConfigModule.forRoot({ load: [configs] })],
			providers: [ErrorHandler],
		}).compile()

		errorHandler = moduleRef.get<ErrorHandler>(ErrorHandler)
	}, TIMEOUT)

	describe('Database Error Handling', () => {
		it('should handle database errors consistently across all database types', () => {
			const testCases = [
				{
					type: DataSourceType.POSTGRES,
					error: {
						code: '23505',
						detail: 'Key (email)=(test@example.com) already exists.',
						message: 'duplicate key value violates unique constraint',
					},
					expectedMessage: 'Database error: Duplicate record found',
				},
				{
					type: DataSourceType.MYSQL,
					error: {
						code: 'ER_DUP_ENTRY',
						message: "Duplicate entry 'test@example.com' for key 'email_unique'",
					},
					expectedMessage: 'Database error: Duplicate record found',
				},
				{
					type: DataSourceType.MONGODB,
					error: {
						code: 11000,
						keyPattern: { email: 1 },
						keyValue: { email: 'test@example.com' },
					},
					expectedMessage: 'Database error: Duplicate record found',
				},
				{
					type: DataSourceType.MSSQL,
					error: {
						number: 2627,
						message: "Violation of UNIQUE constraint 'UQ_users_email'.",
					},
					expectedMessage: 'Database error: Duplicate record found',
				},
			]

			for (const { type, error, expectedMessage } of testCases) {
				const result = errorHandler.handleDatabaseError(error, type)
				expect(result).toBe(expectedMessage)
			}
		})

		it('should handle type mismatches consistently across all database types', () => {
			const testCases = [
				{
					type: DataSourceType.POSTGRES,
					error: {
						code: '22P02',
						message: 'invalid input syntax for type integer',
					},
					expectedMessage: 'Database error: Invalid data type',
				},
				{
					type: DataSourceType.MYSQL,
					error: {
						code: 'ER_TRUNCATED_WRONG_VALUE',
						message: 'Incorrect integer value',
					},
					expectedMessage: 'Database error: Invalid data type',
				},
				{
					type: DataSourceType.MONGODB,
					error: {
						name: 'CastError',
						kind: 'Number',
					},
					expectedMessage: 'Database error: Invalid data type',
				},
				{
					type: DataSourceType.MSSQL,
					error: {
						number: 8114,
						message: 'Error converting data type',
					},
					expectedMessage: 'Database error: Invalid data type',
				},
			]

			for (const { type, error, expectedMessage } of testCases) {
				const result = errorHandler.handleDatabaseError(error, type)
				expect(result).toBe(expectedMessage)
			}
		})

		it('should handle unknown database errors consistently', () => {
			const error = {
				message: 'Unknown error occurred',
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.POSTGRES)
			expect(result).toBe('Database error: Unknown error occurred')
		})
	})
})
