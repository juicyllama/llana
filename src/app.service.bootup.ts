import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cache } from 'cache-manager'

import { APP_BOOT_CONTEXT, LLANA_AUTH_TABLE, LLANA_ROLES_TABLE } from './app.constants'
import { Authentication } from './helpers/Authentication'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'
import { Schema } from './helpers/Schema'
import { AuthType } from './types/auth.types'
import { DatabaseColumnType, DatabaseSchema, QueryPerform } from './types/database.types'
import { CustomRole, DefaultRole, RolePermission } from './types/roles.types'

@Injectable()
export class AppBootup implements OnApplicationBootstrap {
	constructor(
		private readonly authentication: Authentication,
		private readonly configService: ConfigService,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async onApplicationBootstrap() {
		this.logger.log('Bootstrapping Application', APP_BOOT_CONTEXT)

		this.logger.log('Resetting Cache', APP_BOOT_CONTEXT)
		await this.cacheManager.reset()

		try {
			await this.query.perform(QueryPerform.CHECK_CONNECTION, undefined, APP_BOOT_CONTEXT)
			this.logger.log('Database Connection Successful', APP_BOOT_CONTEXT)
		} catch (e) {
			this.logger.error(`Database Connection Error - ${e.message}`, APP_BOOT_CONTEXT)
			throw new Error('Database Connection Error')
		}

		this.logger.log('Checking for _llana_auth and _llana_roles tables', APP_BOOT_CONTEXT)

		try {
			await this.schema.getSchema({ table: LLANA_AUTH_TABLE, x_request_id: APP_BOOT_CONTEXT })
		} catch (e) {
			this.logger.log(`Creating ${LLANA_AUTH_TABLE} schema as it does not exist - ${e.message}`, APP_BOOT_CONTEXT)

			/**
			 * Create the _llana_auth schema
			 *
			 * |Field | Type | Details|
			 * |--------|---------|--------|
			 * |`auth` | `enum` | Which auth type this applies to, either `APIKEY` or `JWT` |
			 * |`type` | `enum` | If to `INCLUDE` or `EXCLUDE` the endpoint, excluding means authentication will not be required |
			 * |`table` | `string` | The table this rule applies to |
			 * |`public_records` | `enum` | The permission level if `EXCLUDE` and opened to the public, either `NONE` `READ` `WRITE` `DELETE`|
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
					{
						field: 'public_records',
						type: DatabaseColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['NONE', 'READ', 'WRITE', 'DELETE'],
					},
				],
			}

			await this.query.perform(QueryPerform.CREATE_TABLE, { schema }, APP_BOOT_CONTEXT)

			// Example Auth Table - For example allowing external API access to see Employee data

			if (!this.authentication.skipAuth()) {
				const example_auth: any[] = [
					{
						auth: AuthType.APIKEY,
						type: 'EXCLUDE',
						table: 'Employee',
						public_records: RolePermission.READ,
					},
					{
						auth: AuthType.JWT,
						type: 'EXCLUDE',
						table: 'Employee',
						public_records: RolePermission.READ,
					},
				]

				for (const example of example_auth) {
					await this.query.perform(
						QueryPerform.CREATE,
						{
							schema,
							data: example,
						},
						APP_BOOT_CONTEXT,
					)
				}
			}
		}

		try {
			await this.schema.getSchema({ table: LLANA_ROLES_TABLE, x_request_id: APP_BOOT_CONTEXT })
		} catch (e) {
			this.logger.log(
				`Creating ${LLANA_ROLES_TABLE} schema as it does not exist - ${e.message}`,
				APP_BOOT_CONTEXT,
			)

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

			await this.query.perform(QueryPerform.CREATE_TABLE, { schema }, APP_BOOT_CONTEXT)

			if (!this.authentication.skipAuth()) {
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
						table: this.authentication.getIdentityTable(),
						records: RolePermission.DELETE,
						own_records: RolePermission.DELETE,
					},
					{
						custom: true,
						role: 'EDITOR',
						table: this.authentication.getIdentityTable(),
						records: RolePermission.NONE,
						own_records: RolePermission.WRITE,
					},
					{
						custom: true,
						role: 'VIEWER',
						table: this.authentication.getIdentityTable(),
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
					await this.query.perform(
						QueryPerform.CREATE,
						{
							schema,
							data: default_role,
						},
						APP_BOOT_CONTEXT,
					)
				}

				for (const custom_role of custom_roles) {
					await this.query.perform(
						QueryPerform.CREATE,
						{
							schema,
							data: custom_role,
						},
						APP_BOOT_CONTEXT,
					)
				}
			}
		}

		if (this.authentication.skipAuth()) {
			this.logger.warn(
				'Skipping auth is set to true, you should maintain _llana_auth table for any WRITE permissions',
				APP_BOOT_CONTEXT,
			)
		}

		this.logger.log('TODO: Build out OPenAPI docs', APP_BOOT_CONTEXT)

		this.logger.log('Application Bootstrapping Complete', APP_BOOT_CONTEXT)
	}
}
