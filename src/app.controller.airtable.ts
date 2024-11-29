import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { AirtableService } from './app.service.airtable'

@Controller('airtable')
export class AirtableController {
  constructor(private readonly airtableService: AirtableService) {}

  @Get(':tableName')
  async getRecords(@Param('tableName') tableName: string): Promise<any[]> {
    return this.airtableService.getRecords(tableName)
  }

  @Post(':tableName')
  async createRecord(@Param('tableName') tableName: string, @Body() fields: any): Promise<any> {
    return this.airtableService.createRecord(tableName, fields)
  }

  @Post(':tableName/:recordId')
  async updateRecord(
    @Param('tableName') tableName: string,
    @Param('recordId') recordId: string,
    @Body() fields: any,
  ): Promise<any> {
    return this.airtableService.updateRecord(tableName, recordId, fields)
  }

  @Post(':tableName/:recordId/delete')
  async deleteRecord(@Param('tableName') tableName: string, @Param('recordId') recordId: string): Promise<void> {
    return this.airtableService.deleteRecord(tableName, recordId)
  }
}
