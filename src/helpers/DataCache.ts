import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cache } from 'cache-manager'
import { Query } from './Query'
import { Logger } from './Logger'
import { Schema } from './Schema'
import { FindManyResponseObject } from '../dtos/response.dto'
import { CACHE_DEFAULT_TABLE_SCHEMA_TTL } from '../app.constants'
import { QueryPerform } from '../types/datasource.types'
import { CronExpression } from '@nestjs/schedule'
import { cronToSeconds } from '../utils/String'

const tableCacheKey = `dataCache:_llana_data_caching:*`

@Injectable()
export class DataCache {
	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly logger: Logger,
		private readonly configService: ConfigService,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	/**
	 * Checks the request to see if we have a _llana_data_caching match and if so returns it
	 */

	async get(options: { originalUrl: string; x_request_id: string  }): Promise<FindManyResponseObject | undefined> {
		if (!this.configService.get<boolean>('USE_DATA_CACHING')) {
			return
		}
		
		const urlParts = options.originalUrl.split('?')
		const table = urlParts[0].split('/')[1]
		const request = '?' + urlParts[1] || undefined

		if (!table) {
			this.logger.error(`${options.x_request_id ? '['+ options.x_request_id +']' : ''}[DataCache][Get] Table not provided`)
			return
		}

		if (!request) {
			this.logger.error(`${options.x_request_id ? '['+ options.x_request_id +']' : ''}[DataCache][Get] Request not provided`)
			return
		}

		const cacheKey = `dataCache:${table}:${request}`
		
		//get caching data from table
		
		let caching: FindManyResponseObject | undefined = await this.cacheManager.get(tableCacheKey)

		if(!caching || caching.total === 0) {
			
			const schema = await this.schema.getSchema({table: '_llana_data_caching'})

			caching = (await this.query.perform(
						QueryPerform.FIND_MANY,
						{
							schema,
							limit: 99999,
						},
						options.x_request_id
					)) as FindManyResponseObject

			if (caching && caching.total > 0) {
				await this.cacheManager.set(tableCacheKey, caching, this.configService.get<number>('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_TABLE_SCHEMA_TTL)
			}

		}

		if (!caching || caching.total === 0) {
			this.logger.debug(`${options.x_request_id ? '['+ options.x_request_id +']' : ''}[DataCache][Get] No caching data found`)
			return
		}

		for(const cache of caching.data) {
			if (cache.table === table) {
				if (cache.request === request) {
					this.logger.debug(`${options.x_request_id ? '['+ options.x_request_id +']' : ''}[DataCache][Get] Found cache match data for ${table} with request ${request}`)
					return await this.cacheManager.get(cacheKey)
				}
			}
		}

		return 
	}

	/**
	 * Updates _llana_data_caching when table data is changed for cache tracking
	 */

	async ping(table: string) {

		if (!this.configService.get<boolean>('USE_DATA_CACHING')) {
			return
		}

		const schema = await this.schema.getSchema({table: '_llana_data_caching'})

		let caching: FindManyResponseObject | undefined = await this.cacheManager.get(tableCacheKey)

		if(!caching || caching.total === 0) {

			caching = (await this.query.perform(
						QueryPerform.FIND_MANY,
						{
							schema,
							limit: 99999,
						},
					)) as FindManyResponseObject

			if (caching && caching.total > 0) {
				await this.cacheManager.set(tableCacheKey, caching, this.configService.get<number>('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_TABLE_SCHEMA_TTL)
			}

		}

		if (!caching || caching.total === 0) {
			this.logger.debug('[DataCache][Ping] No caching data found')
			return
		}

		for(const cache of caching.data) {
			if (cache.table === table) {
				await this.query.perform(
					QueryPerform.UPDATE,
					{
						id: cache.id,
						schema,
						data: {
							data_changed_at: new Date(),
						}
					},
				)
			}
		}
	}


	/**
	 * Generates the cache date for results which need refreshing
	 */

	async refresh(cronSchedule: CronExpression) {

		if (!this.configService.get<boolean>('USE_DATA_CACHING')) {
			return
		}

		//get the cache time (now - cron run time)
		const cronTimeInSeconds = cronToSeconds(cronSchedule)
		const cacheTime = new Date(new Date().getTime() - (cronTimeInSeconds * 1000))

		const schema = await this.schema.getSchema({table: '_llana_data_caching'})

		let caching: FindManyResponseObject | undefined = await this.cacheManager.get(tableCacheKey)

		if(!caching || caching.total === 0) {

			caching = (await this.query.perform(
						QueryPerform.FIND_MANY,
						{
							schema,
							limit: 99999,
						},
					)) as FindManyResponseObject

			if (caching && caching.total > 0) {
				await this.cacheManager.set(tableCacheKey, caching, this.configService.get<number>('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_TABLE_SCHEMA_TTL)
			}

		}

		if (!caching || caching.total === 0) {
			this.logger.debug('[DataCache][Refresh] No caching data found')
			return
		}

		for(const cache of caching.data) {

			//check if cache key exists
			const cacheKey = `dataCache:${cache.table}:${cache.request}`

			let cachedItem = await this.cacheManager.get(cacheKey)
			
			if(!cachedItem) {
				this.logger.debug(`[DataCache][Refresh] Cache not found for ${cache.table} with request ${cache.request}`)
			}else{

				//check if the cache is expired
				if(cache.expires_at && cache.expires_at > cacheTime) {	
					continue
				}

				//check if the data has changed since last refresh
				if(cache.data_changed_at && cache.refreshed_at && cache.data_changed_at < cache.refreshed_at) {
					continue
				}
			}

			const table_schema = await this.schema.getSchema({table: cache.table})

			if(!table_schema) {
				this.logger.error(`[DataCache][Refresh] Schema not found for ${cache.table}`)
				continue
			}

			const options = await this.query.buildFindManyOptionsFromRequest({request: cache.request, schema: table_schema})

			const result = await this.query.perform(
				QueryPerform.FIND_MANY,
				options
			) as FindManyResponseObject

			if(!result || result.total === 0) {
				this.logger.warn(`[DataCache][Refresh] No data found for ${cache.table} with request ${cache.request}`)
				continue
			}

			await this.cacheManager.set(cacheKey, result, (cache.ttl_seconds * 1000))
			this.logger.debug(`[DataCache][Refresh] Cache refreshed for ${cache.table} with request ${cache.request}`)

			//update the cache record
			await this.query.perform(
				QueryPerform.UPDATE,
				{
					id: cache.id,
					schema,
					data: {
						refreshed_at: new Date(),
						expires_at: new Date(new Date().getTime() + (cache.ttl_seconds * 1000)),
					}
				})

			await this.cacheManager.del(tableCacheKey)
		}
	}

}
