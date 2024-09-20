import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ListTablesResponseObject } from '../dtos/response.dto'
import { QueryPerform } from '../types/database.types'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

@Injectable()
export class Documentation {
	constructor(
		private readonly logger: Logger,
		private readonly configService: ConfigService,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	/**
	 * Generate documentation for the application
	 */

	async generateDocumentation(): Promise<void> {
		const DOCS = 'DOCS'

		this.logger.log('Generating documentation')
		const { tables } = (await this.query.perform(
			QueryPerform.LIST_TABLES,
			undefined,
			DOCS,
		)) as ListTablesResponseObject
		for (const table of tables) {
			const schema = await this.schema.getSchema({ table, x_request_id: DOCS })
			console.log(schema)
		}
	}
}
