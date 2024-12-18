import { Injectable, Logger } from '@nestjs/common'

import { DataSourceType } from '../types/datasource.types'

@Injectable()
export class ErrorHandler {
	private readonly logger = new Logger(ErrorHandler.name)

	handleDatabaseError(error: any, datasourceType: DataSourceType): string {
		this.logger.debug(`[ErrorHandler] Processing error for ${datasourceType}: ${JSON.stringify(error)}`)

		// Extract the base error message without any prefixes
		const baseMessage = this.getBaseErrorMessage(error, datasourceType)

		// Only add the prefix if it's not already there
		return baseMessage.includes('Database error:') ? baseMessage : `Database error: ${baseMessage}`
	}

	private getBaseErrorMessage(error: any, datasourceType: DataSourceType): string {
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
				return error.message || 'Unknown error'
		}
	}

	private handlePostgresError(error: any): string {
		if (error.code === '23505') {
			return 'Duplicate record found'
		}
		if (error.code === '22P02') {
			return 'Invalid data type'
		}
		return error.message || 'Unknown error'
	}

	private handleMySQLError(error: any): string {
		// Handle MySQL error codes directly
		if (error.code === 'ER_DUP_ENTRY') {
			return 'Duplicate record found'
		}
		if (error.code === 'ER_TRUNCATED_WRONG_VALUE' || error.code === 'ER_BAD_FIELD_ERROR') {
			return 'Invalid data type'
		}
		// If no specific error code matches, try to extract a meaningful message
		return error.message || 'Unknown error'
	}

	private handleMongoError(error: any): string {
		if (error.code === 11000) {
			return 'Duplicate record found'
		}
		if (error.name === 'CastError') {
			return 'Invalid data type'
		}
		return error.message || 'Unknown error'
	}

	private handleMSSQLError(error: any): string {
		if (error.number === 2627) {
			return 'Duplicate record found'
		}
		if (error.number === 8114) {
			return 'Invalid data type'
		}
		return error.message || 'Unknown error'
	}
}
