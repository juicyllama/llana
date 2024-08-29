import {Controller, Get, Req, Res} from '@nestjs/common';
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
    return this.service.list();
  }

  @Get('*/:id')
  async get(@Req() req, @Res() res): Promise<GetResponseObject> {
   
    const table_name = UrlToTable(req.originalUrl, 1)

    this.logger.log('table_name', {table_name})

    let schema
    
    try{
        schema = await this.query.getSchema(table_name)
    }catch(e){
        return res.status(404).send('Endpoint not found')
    }

    this.logger.log('schema', {schema})
    const entitySchema = this.schema.create(table_name, schema)
    this.logger.log('entitySchema', {entitySchema})
    
    //TODO: apply restrictions or return 403

    //validate :id field
    const columns = <any[]>entitySchema.options.columns
    const column = columns.find(column => column.primary)

    switch(column.type){
        case 'int':
            if(isNaN(parseInt(req.params.id))){
                return res.status(400).send('Invalid id')
            }
            break
        case 'varchar':
            if(req.params.id.length > column.length){
                return res.status(400).send('Invalid id')
            }
            break
        default:
            return res.status(400).send('Invalid id')
    }

    //TODO: valiate fields[] and relations[]

    //TODO: for list validate limit and offset
    

    return res.status(200).send(await this.service.get(table_name, entitySchema, req.params.id))

    //TODO: tests 
  }


}
