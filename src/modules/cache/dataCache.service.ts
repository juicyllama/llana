import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common'
import Redis from 'ioredis'
import { Logger } from '../../helpers/Logger'
import { REDIS_CACHE_TOKEN } from './dataCache.constants'
import { FindManyResponseObject } from '../../dtos/response.dto'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { ConfigService } from '@nestjs/config'
import { Query } from '../../helpers/Query'
import { Schema } from '../../helpers/Schema'
import { DataSourceFindOneOptions, QueryPerform } from '../../types/datasource.types'
import { CronExpression } from '@nestjs/schedule'
import { cronToSeconds } from '../../utils/String'
import { CACHE_DEFAULT_TABLE_SCHEMA_TTL } from 'src/app.constants'

const tableCacheKey = `dataCache:_llana_data_caching`

@Injectable()
export class DataCacheService implements OnApplicationShutdown {
	constructor(
		private readonly logger: Logger,
		@Inject(REDIS_CACHE_TOKEN) private readonly redis: Redis,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly configService: ConfigService,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	onApplicationShutdown() {
		if(this.useRedis()){
			this.redis.disconnect()
		}
	}

	public useRedis(): Boolean{
		const redisPort = this.configService.get<string>('REDIS_PORT')
		const redisHost = this.configService.get<string>('REDIS_HOST')
		return !!(redisPort && redisHost)
	}

	public cacheType(): 'READ' | 'WRITE' | undefined {

		if(!this.configService.get<string>('USE_DATA_CACHING')){
			return undefined
		}

		if(this.configService.get<string>('USE_DATA_CACHING') === 'READ'){
			return 'READ'
		}

		if(this.configService.get<string>('USE_DATA_CACHING') === 'WRITE'){
			return 'WRITE'
		}

		if( this.configService.get<boolean>('USE_DATA_CACHING')){
			return 'WRITE'
		}
	}

	/**
	 * Read from cache
	 * * Will use Redis if available
	 * * otherwise will use in-memory cache
	 */

	public async read(key: string): Promise<any> {

		this.logger.debug(`[CacheService] Reading ${key} from cache`)

		if(this.useRedis()){
			if (this.redis.status !== 'ready') {
				throw new Error('Redis client not ready')
			}

			const value = await this.redis.get(key)
			return value ? JSON.parse(value) : undefined

		}else{
			return await this.cacheManager.get(key)
		}
	}

	/**
	 * Write to cache
	 * * Will use Redis if available
	 * * otherwise will use in-memory cache
	 */

	public async write(key: string, value: any, ttl: number): Promise<void> {

		this.logger.debug(`[CacheService] Writing ${key} to cache`)

		if(this.useRedis()){
			if (this.redis.status !== 'ready') {
				throw new Error('Redis client not ready')
			}

			await this.redis.set(key, JSON.stringify(value), 'PX', ttl)
		}else{
			await this.cacheManager.set(key, value, ttl)
		}
	}

	/**
	 * Delete from cache
	 * * Will use Redis if available
	 * * otherwise will use in-memory cache
	 */

	public async del(key: string): Promise<void> {
		this.logger.debug(`[CacheService] Deleting ${key} from cache`)

		if(this.useRedis()){
			if (this.redis.status !== 'ready') {
				throw new Error('Redis client not ready')
			}

			await this.redis.del(key)
		}else{
			await this.cacheManager.del(key)
		}
	}


	/**
	 * Checks the request to see if we have a _llana_data_caching match and if so returns it
	 */

	async get(options: { originalUrl: string; x_request_id: string  }): Promise<FindManyResponseObject | undefined> {
		
		if(!this.cacheType()){
			this.logger.debug(`[DataCache][Get] Cache is not enabled`)
			return
		}

		const urlParts = options.originalUrl.split('?')
		const table = urlParts[0].split('/')[1]
		const request = urlParts[1] ? `?${urlParts[1]}` : undefined

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

		let caching: FindManyResponseObject | undefined = await this.read(tableCacheKey)

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
				await this.write(tableCacheKey, caching, this.configService.get<number>('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_TABLE_SCHEMA_TTL)
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
					return await this.read(cacheKey)
				}
			}
		}

		return
	}

	/**
	 * Updates _llana_data_caching when table data is changed for cache tracking
	 */

	async ping(table: string) {

		if(!this.cacheType()){
			this.logger.debug(`[DataCache][Get] Cache is not enabled`)
			return
		}

		const schema = await this.schema.getSchema({table: '_llana_data_caching'})

		let caching: FindManyResponseObject | undefined = await this.read(tableCacheKey)

		if(!caching || caching.total === 0) {

			caching = (await this.query.perform(
						QueryPerform.FIND_MANY,
						{
							schema,
							limit: 99999,
						},
					)) as FindManyResponseObject

			if (caching && caching.total > 0) {
				await this.write(tableCacheKey, caching, this.configService.get<number>('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_TABLE_SCHEMA_TTL)
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

				await this.del(tableCacheKey)
			}
		}
	}


	/**
	 * Generates the cache date for results which need refreshing
	 */

	async refresh(cronSchedule: CronExpression) {

		if(!this.cacheType()){
			this.logger.debug(`[DataCache][Get] Cache is not enabled`)
			return
		}

		if(this.cacheType() === 'READ'){
			this.logger.debug(`[DataCache][Get] Cache is set to READ, skipping write`)
			return
		}

		//get the cache time (now - cron run time)
		const cronTimeInSeconds = cronToSeconds(cronSchedule)
		const cacheTime = new Date(new Date().getTime() - (cronTimeInSeconds * 1000))

		const schema = await this.schema.getSchema({table: '_llana_data_caching'})

		let caching: FindManyResponseObject | undefined = await this.read(tableCacheKey)

		if(!caching || caching.total === 0) {

			caching = (await this.query.perform(
						QueryPerform.FIND_MANY,
						{
							schema,
							limit: 99999,
						},
					)) as FindManyResponseObject

			if (caching && caching.total > 0) {
				await this.write(tableCacheKey, caching, this.configService.get<number>('CACHE_TABLE_SCHEMA_TTL') ?? CACHE_DEFAULT_TABLE_SCHEMA_TTL)
			}

		}

		if (!caching || caching.total === 0) {
			this.logger.debug('[DataCache][Refresh] No caching data found')
			return
		}

		for(const cache of caching.data) {

			try{


			//check if cache key exists
			const cacheKey = `dataCache:${cache.table}:${cache.request}`

			let cachedItem = await this.read(cacheKey)

			if(!cachedItem) {
				this.logger.debug(`[DataCache][Refresh][${cache.id}] Cache not found for ${cache.table} with request ${cache.request}`)
			}else{

				//check if the data has changed since last refresh
				if(!cache.data_changed_at || (cache.data_changed_at && cache.refreshed_at && cache.data_changed_at < cache.refreshed_at)) {
					continue
				}

				//check if the cache is expired
				if(cache.expires_at && cache.expires_at > cacheTime) {
					continue
				}

				this.logger.debug(`[DataCache][Refresh][${cache.id}] Table data changed and cache expired for ${cache.table} with request ${cache.request}`, {
					cacheTime,
					expiresAt: cache.expires_at,
					dataChangedAt: cache.data_changed_at,
					refreshedAt: cache.refreshed_at
				})

			}

			const table_schema = await this.schema.getSchema({table: cache.table})

			if(!table_schema) {
				this.logger.error(`[DataCache][Refresh][${cache.id}] Schema not found for ${cache.table}`)
				continue
			}

			const options = await this.query.buildFindManyOptionsFromRequest({request: cache.request, schema: table_schema})

			this.logger.verbose(`[DataCache][Refresh][${cache.id}] Options: ${JSON.stringify({
				...options,
				schema: undefined, //remove the schema from the options for readability
			})}`)

			const result = await this.query.perform(
				QueryPerform.FIND_MANY,
				options
			) as FindManyResponseObject

			if(options.relations && options.relations.length > 0) {
				this.logger.verbose(`[DataCache][Refresh][${cache.id}] Building relations for ${cache.table} with request ${cache.request}`)

				for (const i in result.data) {
					result.data[i] = await this.query.buildRelations(
						options as DataSourceFindOneOptions,
						result.data[i],
						undefined
					)
				}
			}

			await this.write(cacheKey, result, cache.ttl_seconds * 1000)
			this.logger.debug(`[DataCache][Refresh][${cache.id}] Cache refreshed for ${cache.table} with request ${cache.request}`)
			
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

			await this.del(tableCacheKey)
			}catch (e) {
				this.logger.error(`[DataCache][Refresh][${cache.id}] Error refreshing cache for ${cache.table} with request ${cache.request}`, e)
			}
		}
	}

}
