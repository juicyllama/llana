import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { LLANA_AUTH_TABLE, LLANA_ROLES_TABLE } from './app.constants'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'
import { Schema } from './helpers/Schema'
import { DatabaseColumnType, DatabaseSchema, QueryPerform } from './types/database.types'
import { CustomRole, DefaultRole, RolePermission } from './types/roles.types'

@Injectable()
export class AppBootup implements OnApplicationBootstrap {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async onApplicationBootstrap() {
		try {
			const table = this.configService.get<string>('AUTH_USER_TABLE_NAME') ?? 'User'
			await this.schema.getSchema(table)
		} catch (e) {
			this.logger.error(`Database Connection Error - ${e.message}`)
			throw new Error('Database Connection Error')
		}

		try {
			await this.schema.getSchema(LLANA_AUTH_TABLE)
		} catch (e) {
			this.logger.log(`Creating ${LLANA_AUTH_TABLE} schema as it does not exist - ${e.message}`)

			/**
			 * Create the _llana_auth schema
			 *
			 * |Field | Type | Details|
			 * |--------|---------|--------|
			 * |`auth` | `enum` | Which auth type this applies to, either `APIKEY` or `JWT` |
			 * |`type` | `enum` | If to `INCLUDE` or `EXCLUDE` the endpoint, excluding means authentication will not be required |
			 * |`table` | `string` | The table this rule applies to |
			 */

			const schema: DatabaseSchema = {
				table: LLANA_AUTH_TABLE,
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DatabaseColumnType.NUMBER,
						nullable: false,
						required: true,
						primary_key: true,
						unique_key: true,
						foreign_key: false,
						auto_increment: true,
					},
					{
						field: 'auth',
						type: DatabaseColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['APIKEY', 'JWT'],
					},
					{
						field: 'type',
						type: DatabaseColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['INCLUDE', 'EXCLUDE'],
					},
					{
						field: 'table',
						type: DatabaseColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
				],
			}

			await this.query.createTable(schema)
		}

		try {
			await this.schema.getSchema(LLANA_ROLES_TABLE)
		} catch (e) {
			this.logger.log(`Creating ${LLANA_ROLES_TABLE} schema as it does not exist - ${e.message}`)

			/**
			 * Create the _llana_role schema
			 *
			 * |Field | Type | Details|
			 * |--------|---------|--------|
			 * |`custom` | `boolean` | If this is a custom role (applied to specific endpoints) |
			 * |`table` | `string` | If not default, which table does this restriction apply to |
			 * |`identity_column` | `string` | If not default and the primary key of the table is not the user identifier, which column should be used to identify the user |
			 * |`role` | `string` | The name of the role, which should match the value from your users role field |
			 * |`records` | `enum` | The permission level for this role across all records in the table, either `NONE` `READ` `WRITE` `DELETE`|
			 * |`own_records` | `enum` | The permission level for this role if it includes a reference back to the user identity (their own records) either `NONE` `READ` `WRITE` `DELETE`|
			 */

			const schema: DatabaseSchema = {
				table: LLANA_ROLES_TABLE,
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DatabaseColumnType.NUMBER,
						nullable: false,
						required: true,
						primary_key: true,
						unique_key: true,
						foreign_key: false,
						auto_increment: true,
					},
					{
						field: 'custom',
						type: DatabaseColumnType.BOOLEAN,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'table',
						type: DatabaseColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'identity_column',
						type: DatabaseColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'role',
						type: DatabaseColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'records',
						type: DatabaseColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['NONE', 'READ', 'WRITE', 'DELETE'],
					},
					{
						field: 'own_records',
						type: DatabaseColumnType.ENUM,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['NONE', 'READ', 'WRITE', 'DELETE'],
					},
				],
			}

			await this.query.createTable(schema)

			const default_roles: DefaultRole[] = [
				{
					custom: false,
					role: 'ADMIN',
					records: RolePermission.DELETE,
				},
				{
					custom: false,
					role: 'EDITOR',
					records: RolePermission.WRITE,
				},
				{
					custom: false,
					role: 'VIEWER',
					records: RolePermission.READ,
				},
			]
			const custom_roles: CustomRole[] = [
				{
					custom: true,
					role: 'ADMIN',
					table: this.configService.get<string>('AUTH_USER_TABLE_NAME') ?? 'User',
					records: RolePermission.DELETE,
					own_records: RolePermission.DELETE,
				},
				{
					custom: true,
					role: 'EDITOR',
					table: this.configService.get<string>('AUTH_USER_TABLE_NAME') ?? 'User',
					records: RolePermission.NONE,
					own_records: RolePermission.WRITE,
				},
				{
					custom: true,
					role: 'VIEWER',
					table: this.configService.get<string>('AUTH_USER_TABLE_NAME') ?? 'User',
					records: RolePermission.NONE,
					own_records: RolePermission.WRITE,
				},
				{
					custom: true,
					role: 'ADMIN',
					table: this.configService.get<string>('AUTH_USER_API_KEY_TABLE_NAME') ?? 'UserApiKey',
					identity_column:
						this.configService.get<string>('AUTH_USER_API_KEY_TABLE_IDENTITY_COLUMN') ?? 'UserId',
					records: RolePermission.DELETE,
					own_records: RolePermission.DELETE,
				},
				{
					custom: true,
					role: 'EDITOR',
					table: this.configService.get<string>('AUTH_USER_API_KEY_TABLE_NAME') ?? 'UserApiKey',
					identity_column:
						this.configService.get<string>('AUTH_USER_API_KEY_TABLE_IDENTITY_COLUMN') ?? 'UserId',
					records: RolePermission.NONE,
					own_records: RolePermission.WRITE,
				},
				{
					custom: true,
					role: 'VIEWER',
					table: this.configService.get<string>('AUTH_USER_API_KEY_TABLE_NAME') ?? 'UserApiKey',
					identity_column:
						this.configService.get<string>('AUTH_USER_API_KEY_TABLE_IDENTITY_COLUMN') ?? 'UserId',
					records: RolePermission.NONE,
					own_records: RolePermission.WRITE,
				},
			]

			for (const default_role of default_roles) {
				await this.query.perform(QueryPerform.CREATE, {
					schema,
					data: default_role,
				})
			}

			for (const custom_role of custom_roles) {
				await this.query.perform(QueryPerform.CREATE, {
					schema,
					data: custom_role,
				})
			}
		}
	}
}
