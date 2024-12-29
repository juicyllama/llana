import { Injectable } from '@nestjs/common'

import { LLANA_RELATION_TABLE } from '../app.constants'
import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { DataSourceCreateOneOptions, DataSourceSchemaRelation, QueryPerform } from '../types/datasource.types'

@Injectable()
export class RelationsTestingService {
	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async createRelationsRecord(data: DataSourceSchemaRelation): Promise<FindOneResponseObject> {
		const schema = await this.schema.getSchema({ table: LLANA_RELATION_TABLE, x_request_id: 'test' })
		return (await this.query.perform(QueryPerform.CREATE, <DataSourceCreateOneOptions>{
			schema,
			data,
		})) as FindOneResponseObject
	}

	async deleteRelationsRecord(data: any): Promise<void> {
		const schema = await this.schema.getSchema({ table: LLANA_RELATION_TABLE, x_request_id: 'test' })
		await this.query.perform(QueryPerform.DELETE, {
			id: data[schema.primary_key],
			schema,
		})
	}


}
