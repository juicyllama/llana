import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Auth, AuthJWT, AuthType } from 'src/types/auth.types'

import { LLANA_PUBLIC_TABLES, LLANA_ROLES_TABLE } from '../app.constants'
import { AuthService } from '../app.service.auth'
import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import {
	DataSourceCreateOneOptions,
	DataSourceSchema,
	DataSourceWhere,
	QueryPerform,
	WhereOperator,
} from '../types/datasource.types'
import { RolePermission } from '../types/roles.types'

@Injectable()
export class AuthTestingService {
	constructor(
		private readonly authService: AuthService,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly configService: ConfigService,
	) {}

	async login(): Promise<string> {
		try {
			const email = 'test@test.com'
			const [, sub] = await this.findUser(email)
			const payload = await this.authService.login({ email, sub })
			return payload.access_token
		} catch (error) {
			console.error('Login failed:', error)
			throw error
		}
	}

	async getUserId(jwt: string): Promise<number> {
		return await this.authService.getUserId(jwt)
	}

	// This function is used to find a user by username and return the user and the user's id
	async findUser(username: string): Promise<[any, string]> {
		const authentications = this.configService.get<Auth[]>('auth')

		const jwtAuthConfig = authentications.find(auth => auth.type === AuthType.JWT)

		let schema: DataSourceSchema
		schema = await this.schema.getSchema({ table: jwtAuthConfig.table.name })

		const where: DataSourceWhere[] = [
			{
				column: (jwtAuthConfig.table as AuthJWT).columns.username,
				operator: WhereOperator.equals,
				value: username,
			},
		]

		const user = await this.query.perform(QueryPerform.FIND_ONE, {
			schema,
			where,
		})
		return [user, user[schema.primary_key]]
	}

	async createPublicTablesRecord(data: {
		table: string
		access_level: RolePermission
		allowed_fields?: string
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
		allowed_fields?: string
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
