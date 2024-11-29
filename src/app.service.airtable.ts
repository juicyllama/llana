import { Injectable } from '@nestjs/common'
import Airtable from 'airtable'

@Injectable()
export class AirtableService {
  private base: Airtable.Base

  constructor() {
    Airtable.configure({
      apiKey: process.env.AIRTABLE_API_KEY,
    })
    this.base = Airtable.base(process.env.AIRTABLE_BASE_ID)
  }

  async getRecords(tableName: string): Promise<any[]> {
    const records = await this.base(tableName).select().all()
    return records.map(record => record.fields)
  }

  async createRecord(tableName: string, fields: any): Promise<any> {
    const record = await this.base(tableName).create(fields)
    return record.fields
  }

  async updateRecord(tableName: string, recordId: string, fields: any): Promise<any> {
    const record = await this.base(tableName).update(recordId, fields)
    return record.fields
  }

  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    await this.base(tableName).destroy(recordId)
  }
}
