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

	describe('PostgreSQL Errors', () => {
		it('should handle unique constraint violations', () => {
			const error = {
				code: '23505',
				detail: 'Key (email)=(test@example.com) already exists.',
				message: 'duplicate key value violates unique constraint',
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.POSTGRES)
			expect(result).toBe("Unique constraint violation: email already exists with value 'test@example.com'")
		})

		it('should handle type mismatches', () => {
			const error = {
				code: '22P02',
				message: 'invalid input syntax for type integer: "not-a-number"',
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.POSTGRES)
			expect(result).toBe('Invalid type: invalid input syntax for type integer: "not-a-number"')
		})
	})

	describe('MySQL Errors', () => {
		it('should handle unique constraint violations', () => {
			const error = {
				code: 'ER_DUP_ENTRY',
				message: "Duplicate entry 'test@example.com' for key 'email_unique'",
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.MYSQL)
			expect(result).toBe(
				"Unique constraint violation: email_unique already exists with value 'test@example.com'",
			)
		})

		it('should handle type mismatches', () => {
			const error = {
				code: 'ER_TRUNCATED_WRONG_VALUE',
				message: 'Incorrect integer value: "not-a-number" for column "id"',
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.MYSQL)
			expect(result).toBe('Invalid type: Incorrect integer value: "not-a-number" for column "id"')
		})
	})

	describe('MongoDB Errors', () => {
		it('should handle unique constraint violations', () => {
			const error = {
				code: 11000,
				keyPattern: { email: 1 },
				keyValue: { email: 'test@example.com' },
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.MONGODB)
			expect(result).toBe("Unique constraint violation: email already exists with value 'test@example.com'")
		})

		it('should handle type mismatches', () => {
			const error = {
				name: 'CastError',
				kind: 'Number',
				value: 'not-a-number',
				path: 'age',
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.MONGODB)
			expect(result).toBe('Invalid type: Cannot cast not-a-number to Number for field age')
		})
	})

	describe('MSSQL Errors', () => {
		it('should handle unique constraint violations', () => {
			const error = {
				number: 2627,
				message:
					"Violation of UNIQUE constraint 'UQ_users_email'. Cannot insert duplicate key in object 'dbo.users'.",
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.MSSQL)
			expect(result).toBe('Unique constraint violation: UQ_users_email')
		})

		it('should handle type mismatches', () => {
			const error = {
				number: 8114,
				message: 'Error converting data type varchar to int.',
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.MSSQL)
			expect(result).toBe('Invalid type: Error converting data type varchar to int.')
		})
	})

	describe('Unknown Errors', () => {
		it('should handle unknown database errors', () => {
			const error = {
				message: 'Unknown error occurred',
			}
			const result = errorHandler.handleDatabaseError(error, DataSourceType.POSTGRES)
			expect(result).toBe('Unknown PostgreSQL error')
		})
	})
})
