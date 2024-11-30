import { Injectable } from '@nestjs/common'
import Airtable from 'airtable'
import { ConfigService } from '@nestjs/config'
import { AirtableFields } from '../types/airtable.types'

@Injectable()
export class AirtableDatabase {
	private base: Airtable.Base

	constructor(private readonly configService: ConfigService) {
		const apiKey = this.configService.get<string>('AIRTABLE_API_KEY')
		const baseId = this.configService.get<string>('AIRTABLE_BASE_ID')

		if (!apiKey || !baseId) {
			throw new Error(
				'Missing required Airtable configuration. Please check AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables.',
			)
		}

		Airtable.configure({
			apiKey,
		})
		this.base = Airtable.base(baseId)
	}

	async getRecords(
		tableName: string,
		options: { pageSize?: number; offset?: string } = { pageSize: 100 },
	): Promise<{ records: AirtableFields[]; offset?: string }> {
		try {
			if (!tableName?.trim()) {
				throw new Error('Table name is required')
			}

			const records = await this.base(tableName)
				.select({ maxRecords: options.pageSize, offset: options.offset })
				.all()

			return {
				records: records.map(record => record.fields as AirtableFields),
				offset: records.length === options.pageSize ? records[records.length - 1].id : undefined,
			}
		} catch (error) {
			throw new Error(`Failed to fetch records from ${tableName}: ${error.message}`)
		}
	}

	async createRecord(tableName: string, fields: AirtableFields): Promise<AirtableFields> {
		try {
			if (!tableName?.trim()) {
				throw new Error('Table name is required')
			}
			if (!fields || Object.keys(fields).length === 0) {
				throw new Error('Fields are required')
			}

			const record = await this.base(tableName).create(fields)
			return record.fields as AirtableFields
		} catch (error) {
			throw new Error(`Failed to create record in ${tableName}: ${error.message}`)
		}
	}

	async updateRecord(tableName: string, recordId: string, fields: AirtableFields): Promise<AirtableFields> {
		try {
			if (!tableName?.trim()) {
				throw new Error('Table name is required')
			}
			if (!recordId?.trim()) {
				throw new Error('Record ID is required')
			}
			if (!fields || Object.keys(fields).length === 0) {
				throw new Error('Fields are required')
			}

			const record = await this.base(tableName).update(recordId, fields)
			return record.fields as AirtableFields
		} catch (error) {
			throw new Error(`Failed to update record ${recordId} in ${tableName}: ${error.message}`)
		}
	}

	async deleteRecord(tableName: string, recordId: string): Promise<void> {
		try {
			if (!tableName?.trim()) {
				throw new Error('Table name is required')
			}
			if (!recordId?.trim()) {
				throw new Error('Record ID is required')
			}

			await this.base(tableName).destroy(recordId)
		} catch (error) {
			throw new Error(`Failed to delete record ${recordId} from ${tableName}: ${error.message}`)
		}
	}
}
