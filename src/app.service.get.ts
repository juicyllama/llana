import { Injectable } from '@nestjs/common';
import { Query } from './helpers/Query';
import { Logger, context } from './helpers/Logger';
import { GetResponseObject, ListResponseObject } from './types/response.types';
import { MySQLSchema } from './types/database.types';

@Injectable()
export class GetService {
  constructor(
    private readonly query: Query,
    private readonly logger: Logger,
){
  logger.setContext(context)
}

  async get(options: {schema: MySQLSchema, key: string, fields?: string, relations?: string}): Promise<GetResponseObject> { 
    return await this.query.findOneById(options)
  }

  async list(): Promise<ListResponseObject> {
    

    this.logger.log('GetService.list')
    return
  }
}