import { Injectable } from '@nestjs/common'
import { Query } from './helpers/Query'
import { GetResponseObject, ListResponseObject } from './types/response.types'
import { DatabaseFindManyOptions, DatabaseFindOneOptions } from './types/database.types'

@Injectable()
export class FindService {
	constructor(private readonly query: Query) {}

	async findById(options: DatabaseFindOneOptions): Promise<GetResponseObject> {
		return await this.query.findById(options)
	}

	async findOne(options: DatabaseFindOneOptions): Promise<GetResponseObject> {
		return await this.query.findOne(options)
	}

	async findMany(options: DatabaseFindManyOptions): Promise<ListResponseObject> {
		return await this.query.findMany(options)
	}
}
