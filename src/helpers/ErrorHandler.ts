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
				return `Database error: ${error.message || 'Unknown error'}`
		}
	}

	private handlePostgresError(error: any): string {
		if (error.code === '23505') {
			const match = error.detail?.match(/Key \((.*?)\)=\((.*?)\)/)
			if (match) {
				const [, field, value] = match
				return `${field} already exists with value '${value}'`
			}
		}
		if (error.code === '22P02') {
			return `Type mismatch: value must be a number`
		}
		return error.message || 'Database error'
	}

	private handleMySQLError(error: any): string {
		if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
			const match = error.message.match(/Duplicate entry '(.+?)' for key '(.+?)'/)
			if (match) {
				const [, value, field] = match
				return `${field} already exists with value '${value}'`
			}
		}
		if (error.code === 'ER_TRUNCATED_WRONG_VALUE' || error.code === 'ER_BAD_FIELD_ERROR') {
			return `Type mismatch: value must be a number`
		}
		return error.message || 'Database error'
	}

	private handleMongoError(error: any): string {
		if (error.code === 11000) {
			const field = Object.keys(error.keyPattern)[0]
			const value = error.keyValue[field]
			return `${field} already exists with value '${value}'`
		}
		if (error.name === 'CastError') {
			return `Type mismatch: value must be a number`
		}
		return error.message || 'Database error'
	}

	private handleMSSQLError(error: any): string {
		if (error.number === 2627) {
			const match = error.message.match(
				/Violation of (UNIQUE|PRIMARY KEY) constraint '(.+?)'\. Cannot insert duplicate key/,
			)
			if (match) {
				const [, , field] = match
				return `${field} already exists`
			}
			return `Unique constraint violation: ${error.message}`
		}
		if (error.number === 8114) {
			return `Type mismatch: value must be a number`
		}
		return error.message || 'Database error'
	}
}
