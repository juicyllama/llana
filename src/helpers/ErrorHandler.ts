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
            default:
                return `Database error: ${error.message}`
        }
    }

    private handlePostgresError(error: any): string {
        if (error.code === '23505') { // Unique violation
            const match = error.detail?.match(/Key \((.*?)\)=\((.*?)\)/)
            if (match) {
                return `Unique constraint violation: ${match[1]} already exists with value '${match[2]}'`
            }
        }
        if (error.code === '22P02') { // Invalid text representation
            return `Invalid type: ${error.message}`
        }
        return error.message || 'Unknown PostgreSQL error'
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
        return error.message || 'Unknown MySQL error'
    }

    private handleMongoError(error: any): string {
        if (error.code === 11000) { // Duplicate key error
            const field = Object.keys(error.keyPattern)[0]
            const value = error.keyValue[field]
            return `Unique constraint violation: ${field} already exists with value '${value}'`
        }
        if (error.name === 'CastError') {
            return `Invalid type: Cannot cast ${error.value} to ${error.kind} for field ${error.path}`
        }
        return error.message || 'Unknown MongoDB error'
    }
}
