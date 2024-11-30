import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, HttpCode, HttpStatus, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AirtableService } from './app.service.airtable';
import { AirtableRecord, AirtableFields } from './types/airtable.types';
import { validateOrReject, ValidationError } from 'class-validator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('airtable')
export class AirtableController {
  constructor(private readonly airtableService: AirtableService) {}

  @Get(':tableName')
  @ApiOperation({ summary: 'Get records from Airtable table' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Records retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Table not found' })
  async getRecords(
    @Param('tableName') tableName: string,
    @Query() query: { page?: number; limit?: number; filter?: string }
  ): Promise<{ data: AirtableRecord[]; total: number; page: number }> {
    try {
      const { data, total } = await this.airtableService.getRecords(tableName, query);
      return { data, total, page: query.page || 1 };
    } catch (error) {
      if (error.error === 'TABLE_NOT_FOUND') {
        throw new NotFoundException(`Table ${tableName} not found`);
      }
      throw error;
    }
  }

  @Post(':tableName')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new record in Airtable' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Record created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async createRecord(
    @Param('tableName') tableName: string,
    @Body() record: AirtableRecord
  ): Promise<AirtableRecord> {
    try {
      await validateOrReject(record);
      return await this.airtableService.createRecord(tableName, record.fields);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new BadRequestException('Invalid input fields');
      }
      throw error;
    }
  }

  @Put(':tableName/:recordId')
  @ApiOperation({ summary: 'Update existing record in Airtable' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Record updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Record not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Record was modified by another request' })
  async updateRecord(
    @Param('tableName') tableName: string,
    @Param('recordId') recordId: string,
    @Body() record: AirtableRecord,
    @Headers('If-Match') etag?: string,
  ): Promise<AirtableRecord> {
    try {
      await validateOrReject(record);
      return await this.airtableService.updateRecord(tableName, recordId, record.fields, etag);
    } catch (error) {
      if (error.error === 'RECORD_NOT_FOUND') {
        throw new NotFoundException(`Record ${recordId} not found`);
      }
      if (error.error === 'CONCURRENT_UPDATE') {
        throw new ConflictException('Record was modified by another request');
      }
      throw error;
    }
  }

  @Delete(':tableName/:recordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete record from Airtable' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Record deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Record not found' })
  async deleteRecord(
    @Param('tableName') tableName: string,
    @Param('recordId') recordId: string,
    @Query('soft') softDelete?: boolean
  ): Promise<void> {
    try {
      await this.airtableService.deleteRecord(tableName, recordId, softDelete);
    } catch (error) {
      if (error.error === 'RECORD_NOT_FOUND') {
        throw new NotFoundException(`Record ${recordId} not found`);
      }
      throw error;
    }
  }
}
