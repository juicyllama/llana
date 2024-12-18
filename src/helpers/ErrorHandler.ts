import { Injectable, Logger } from '@nestjs/common'

import { DataSourceType } from '../types/datasource.types'

@Injectable()
export class ErrorHandler {
	private readonly logger = new Logger(ErrorHandler.name)

	handleDatabaseError(error: any, datasourceType: DataSourceType): string {
		this.logger.debug(`[ErrorHandler] Processing error for ${datasourceType}: ${JSON.stringify(error)}`)

		switch (datasourceType) {
			case DataSourceType.POSTGRES:
				return this.handlePostgresError(error)
			case DataSourceType.MYSQL:
				return this.handleMySQLError(error)
			case DataSourceType.MONGODB:
				return this.handleMongoError(error)
			case DataSourceType.MSSQL:
				return this.handleMSSQLError(error)
			default:
				return `Unknown ${datasourceType} error${error.message ? ': ' + error.message : ''}`
		}
	}

	private handlePostgresError(error: any): string {
		if (error.code === '23505') {
			// Unique violation
			const match = error.detail?.match(/Key \((.*?)\)=\((.*?)\)/)
			if (match) {
				return `Unique constraint violation: ${match[1]} already exists with value '${match[2]}'`
			}
		}
		if (error.code === '22P02') {
			// Invalid text representation
			return `Invalid type: ${error.message}`
		}
		return 'Unknown PostgreSQL error'
	}

	private handleMySQLError(error: any): string {
		if (error.code === 'ER_DUP_ENTRY') {
			const match = error.message.match(/'(.+?)' for key '(.+?)'/)
			if (match) {
				return `Unique constraint violation: ${match[2]} already exists with value '${match[1]}'`
			}
		}
		if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
			return `Invalid type: ${error.message}`
		}
		return 'Unknown MySQL error'
	}

	private handleMongoError(error: any): string {
		if (error.code === 11000) {
			const field = Object.keys(error.keyPattern)[0]
			const value = error.keyValue[field]
			return `Unique constraint violation: ${field} already exists with value '${value}'`
		}
		if (error.name === 'CastError') {
			return `Invalid type: Cannot cast ${error.value} to ${error.kind} for field ${error.path}`
		}
		return 'Unknown MongoDB error'
	}

	private handleMSSQLError(error: any): string {
		if (error.number === 2627) {
			const match = error.message.match(
				/Violation of (UNIQUE|PRIMARY KEY) constraint '(.+?)'\. Cannot insert duplicate key/,
			)
			if (match) {
				return `Unique constraint violation: ${match[2]}`
			}
			return `Unique constraint violation: ${error.message}`
		}
		if (error.number === 8114) {
			return `Invalid type: ${error.message}`
		}
		return 'Unknown MSSQL error'
	}
}
