import {Controller, Get, Param, Req, Res} from '@nestjs/common';
import { GetService } from './app.service.get';
import { Logger, context } from './helpers/Logger';
import { UrlToTable } from './helpers/Database';
import { Query } from './helpers/Query';
import { Schema } from './helpers/Schema';
import { GetResponseObject, ListResponseObject } from './types/response.types';

@Controller()
export class GetController {
  constructor(
    private readonly service: GetService,
    private readonly logger: Logger,
    private readonly query: Query,
    private readonly schema: Schema
  ) {
      logger.setContext(context)
    }

  @Get('')
  getDocs(@Res() res): string {
      this.logger.log('docs')  
      return res.send(`
        <link rel="icon" href="/favicon.ico">
        <h1>Docs</h1>`
      );
  }

  @Get('/favicon.ico')
  fav(@Res() res): string {
      return res.sendFile('favicon.ico', { root: 'public' });
  }

  @Get('*/list')
  async list(@Req() req, @Res() res): Promise<ListResponseObject> {

    this.logger.log('List')


    //TODO: for list validate limit and offset

    return this.service.list();
  }

  @Get('*/:id')
  async get(@Req() req, @Res() res): Promise<GetResponseObject> {
   
    const table_name = UrlToTable(req.originalUrl, 1)

    let schema
    
    try{
        schema = await this.query.getSchema(table_name)
    }catch(e){
        return res.status(404).send('Endpoint not found')
    }

    //this.logger.log('req', {params: req.params, query: req.query})
    //this.logger.log('schema', {schema})
    
    //TODO: apply restrictions or return 403



    //validate :id field
    const column = schema.columns.find(column => column.Key === 'PRI').Field
    if(!column){
        return res.status(400).send(`No primary key found for table ${table_name}`)
    }

    const validateKey = this.schema.validateColumnData(schema, column, req.params.id)
    if(!validateKey.valid){
        return res.status(400).send(validateKey.message)
    }
    
    let validateFields
    if(req.query.fields){
      validateFields = this.schema.validateFields(schema, req.query.fields)
      if(!validateFields.valid){
          return res.status(400).send(validateFields.message)
      }
    }

    let validateRelations
    if(req.query.relations){
      validateRelations = this.schema.validateRelations(schema, req.query.relations)
      if(!validateRelations.valid){
          return res.status(400).send(validateRelations.message)
      }
    }

    return res.status(200).send(await this.service.get({
      schema, 
      key: req.params.id,
      fields: req.query.fields, 
      relations: req.query.relations
    }))

  }


}
