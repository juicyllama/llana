import { Injectable } from '@nestjs/common'

import { LLANA_PUBLIC_TABLES, LLANA_ROLES_TABLE } from '../app.constants'
import { AuthService } from '../app.service.auth'
import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { DataSourceCreateOneOptions, QueryPerform } from '../types/datasource.types'
import { RolePermission } from '../types/roles.types'

@Injectable()
export class AuthTestingService {
	constructor(
		private readonly authService: AuthService,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async login(): Promise<string> {
		try {
			const username = 'test@test.com'
			const password = 'test'
			const payload = await this.authService.signIn(username, password)
			return payload.access_token
		} catch (error) {
			console.error('Login failed:', error)
			throw error
		}
	}

	async getUserId(jwt: string): Promise<number> {
		return await this.authService.getUserId(jwt)
	}

	async createPublicTablesRecord(data: {
		table: string
		access_level: RolePermission
	}): Promise<FindOneResponseObject> {
		const schema = await this.schema.getSchema({ table: LLANA_PUBLIC_TABLES, x_request_id: 'test' })
		return (await this.query.perform(QueryPerform.CREATE, <DataSourceCreateOneOptions>{
			schema,
			data,
		})) as FindOneResponseObject
	}

	async deletePublicTablesRecord(data: any): Promise<void> {
		const schema = await this.schema.getSchema({ table: LLANA_PUBLIC_TABLES, x_request_id: 'test' })
		await this.query.perform(QueryPerform.DELETE, {
			id: data[schema.primary_key],
			schema,
		})
	}

	async createRole(data: {
		custom: boolean
		table: string
		identity_column?: string
		role: string
		records: RolePermission
		own_records: RolePermission
		allowed_fields?: string[]
	}): Promise<FindOneResponseObject> {
		const schema = await this.schema.getSchema({ table: LLANA_ROLES_TABLE, x_request_id: 'test' })
		return (await this.query.perform(QueryPerform.CREATE, <DataSourceCreateOneOptions>{
			schema,
			data,
		})) as FindOneResponseObject
	}

	async deleteRole(data: any): Promise<void> {
		const schema = await this.schema.getSchema({ table: LLANA_ROLES_TABLE, x_request_id: 'test' })
		await this.query.perform(QueryPerform.DELETE, {
			id: data[schema.primary_key],
			schema,
		})
	}
}
