import { Injectable } from '@nestjs/common'
import { Logger } from './Logger'
import {
	DatabaseType,
	DatabaseFindOneOptions,
	DatabaseFindManyOptions,
} from '../types/database.types'
import { ConfigService } from '@nestjs/config'
import { MySQL } from '../databases/mysql.database'
import { ListResponseObject } from '../types/response.types'

@Injectable()
export class Query {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly mysql: MySQL,
	) {}

	/**
	 * Find record by primary key id
	 */

	async findById(options: DatabaseFindOneOptions): Promise<any> {
		const table_name = options.schema.table


		this.logger.debug(`[Query][Find][One][Id][${table_name}]`, {
			fields: options.fields,
			relations: options.relations,
			where: options.where,
		})

		try {
			switch (this.configService.get<string>('database.type')) {
				case DatabaseType.MYSQL:
					return await this.mysql.findById(options)
				default:
					this.logger.error(
						`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
					)
					return {}
			}
		} catch (e) {
			this.logger.error(`[Query][Find][One][Id][${table_name}] ${e.message}`)
			return {}
		}
	}

	/**
	 * Find single record
	 */

	async findOne(options: DatabaseFindOneOptions): Promise<any> {
		const table_name = options.schema.table

		this.logger.debug(`[Query][Find][One][${table_name}]`, {
			fields: options.fields,
			relations: options.relations,
			where: options.where,
		})

		try {
			switch (this.configService.get<string>('database.type')) {
				case DatabaseType.MYSQL:
					return await this.mysql.findOne(options)
				default:
					this.logger.error(
						`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
					)
					return {}
			}
		} catch (e) {
			this.logger.error(`[Query][Find][One][${table_name}] ${e.message}`)
			return {}
		}
	}

	/**
	 * Find multiple records
	 */

	async findMany(options: DatabaseFindManyOptions): Promise<ListResponseObject> {
		const table_name = options.schema.table

		this.logger.debug(`[Query][Find][Many][${table_name}]`, {
			fields: options.fields,
			relations: options.relations,
			where: options.where,
			limit: options.limit,
			offset: options.offset,
			sort: options.sort,
		})

		try {
			switch (this.configService.get<string>('database.type')) {
				case DatabaseType.MYSQL:
					return await this.mysql.findMany(options)
				default:
					this.logger.error(
						`[Query] Database type ${this.configService.get<string>('database.type')} not supported yet`,
					)
					return null
			}
		} catch (e) {
			this.logger.error(`[Query][Find][Many][${table_name}] ${e.message}`)
			return null
		}
	}
}
