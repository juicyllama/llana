import { Injectable } from '@nestjs/common';
import Airtable from 'airtable';
import { ConfigService } from '@nestjs/config';
import { AirtableRecord, AirtableFields } from '../types/airtable.types';

@Injectable()
export class AirtableDatabase {
  private base: Airtable.Base;

  constructor(private readonly configService: ConfigService) {
    Airtable.configure({
      apiKey: this.configService.get<string>('AIRTABLE_API_KEY'),
    });
    this.base = Airtable.base(this.configService.get<string>('AIRTABLE_BASE_ID'));
  }

  async getRecords(tableName: string): Promise<AirtableFields[]> {
    const records = await this.base(tableName).select().all();
    return records.map(record => record.fields as AirtableFields);
  }

  async createRecord(tableName: string, fields: AirtableFields): Promise<AirtableFields> {
    const record = await this.base(tableName).create(fields);
    return record.fields as AirtableFields;
  }

  async updateRecord(tableName: string, recordId: string, fields: AirtableFields): Promise<AirtableFields> {
    const record = await this.base(tableName).update(recordId, fields);
    return record.fields as AirtableFields;
  }

  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    await this.base(tableName).destroy(recordId);
  }
}
