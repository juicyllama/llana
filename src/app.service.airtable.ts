import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import Airtable from 'airtable'
import { AirtableFields } from './types/airtable.types'

interface AirtableResponse<T> {
	success: boolean
	data?: T
	error?: string
}

@Injectable()
export class AirtableService {
	private base: Airtable.Base

	constructor(private readonly configService: ConfigService) {
		Airtable.configure({
			apiKey: this.configService.get<string>('AIRTABLE_API_KEY'),
		})
		this.base = Airtable.base(this.configService.get<string>('AIRTABLE_BASE_ID'))
	}

	private validateTableName(tableName: string): void {
		if (!tableName?.trim()) {
			throw new Error('Table name is required')
		}
	}

	private validateRecordId(recordId: string): void {
		if (!recordId?.trim()) {
			throw new Error('Record ID is required')
		}
	}

	async getRecords(tableName: string): Promise<AirtableResponse<AirtableFields[]>> {
		try {
			this.validateTableName(tableName)
			const records = await this.base(tableName).select().all()
			return {
				success: true,
				data: records.map(record => record.fields as AirtableFields),
			}
		} catch (error) {
			console.error(`Failed to fetch records from ${tableName}:`, error)
			return {
				success: false,
				error: `Failed to fetch records: ${error.message}`,
			}
		}
	}

	async createRecord(tableName: string, fields: AirtableFields): Promise<AirtableResponse<AirtableFields>> {
		try {
			this.validateTableName(tableName)
			if (!fields || Object.keys(fields).length === 0) {
				throw new Error('Fields are required')
			}
			const record = await this.base(tableName).create(fields)
			return {
				success: true,
				data: record.fields as AirtableFields,
			}
		} catch (error) {
			console.error(`Failed to create record in ${tableName}:`, error)
			return {
				success: false,
				error: `Failed to create record: ${error.message}`,
			}
		}
	}

	async updateRecord(
		tableName: string,
		recordId: string,
		fields: AirtableFields,
	): Promise<AirtableResponse<AirtableFields>> {
		try {
			this.validateTableName(tableName)
			this.validateRecordId(recordId)
			if (!fields || Object.keys(fields).length === 0) {
				throw new Error('Fields are required')
			}
			const record = await this.base(tableName).update(recordId, fields)
			return {
				success: true,
				data: record.fields as AirtableFields,
			}
		} catch (error) {
			console.error(`Failed to update record ${recordId} in ${tableName}:`, error)
			return {
				success: false,
				error: `Failed to update record: ${error.message}`,
			}
		}
	}

	async deleteRecord(tableName: string, recordId: string): Promise<AirtableResponse<void>> {
		try {
			this.validateTableName(tableName)
			this.validateRecordId(recordId)
			await this.base(tableName).destroy(recordId)
			return {
				success: true,
			}
		} catch (error) {
			console.error(`Failed to delete record ${recordId} from ${tableName}:`, error)
			return {
				success: false,
				error: `Failed to delete record: ${error.message}`,
			}
		}
	}
}
