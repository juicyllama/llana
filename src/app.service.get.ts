import { Injectable } from '@nestjs/common';
import { Query } from './helpers/Query';
import { Logger, context } from './helpers/Logger';
import { EntitySchema } from 'typeorm';
import { GetResponseObject, ListResponseObject } from './types/response.types';

@Injectable()
export class GetService {
  constructor(
    private readonly query: Query,
    private readonly logger: Logger,
){
  logger.setContext(context)
}

  async get(table_name: string, schema: EntitySchema<unknown>, key: string, fields?: string[], relations?: string[]): Promise<GetResponseObject> { 
    return await this.query.findOneById(table_name, schema, key, fields, relations)
  }

  async list(): Promise<ListResponseObject> {
    

    this.logger.log('GetService.list')
    return
  }
}
