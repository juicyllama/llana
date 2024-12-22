import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cache } from 'cache-manager'
import * as fs from 'fs'

import {
	APP_BOOT_CONTEXT,
	LLANA_PUBLIC_TABLES,
	LLANA_RELATION_TABLE,
	LLANA_ROLES_TABLE,
	LLANA_WEBHOOK_LOG_TABLE,
	LLANA_WEBHOOK_TABLE,
	NON_RELATIONAL_DBS,
	WEBHOOK_LOG_DAYS,
} from './app.constants'
import { FindManyResponseObject, ListTablesResponseObject } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { Documentation } from './helpers/Documentation'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'
import { Schema } from './helpers/Schema'
import { AuthType } from './types/auth.types'
import {
	ColumnExtraNumber,
	DataSourceColumnType,
	DataSourceSchema,
	PublishType,
	QueryPerform,
	WhereOperator,
} from './types/datasource.types'
import { Method } from './types/response.types'
import { CustomRole, DefaultRole, RolePermission } from './types/roles.types'

@Injectable()
export class AppBootup implements OnApplicationBootstrap {
	constructor(
		private readonly authentication: Authentication,
		private readonly configService: ConfigService,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly documentation: Documentation,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async onApplicationBootstrap() {
		this.logger.log('Bootstrapping Application', APP_BOOT_CONTEXT)

		this.logger.log(
			`Datasource is ${this.configService.get<string>('database.type').toUpperCase()}`,
			APP_BOOT_CONTEXT,
		)

		this.logger.log('Resetting Cache', APP_BOOT_CONTEXT)
		await this.cacheManager.reset()

		try {
			await this.query.perform(QueryPerform.CHECK_CONNECTION, undefined, APP_BOOT_CONTEXT)
			this.logger.log('Database Connection Successful', APP_BOOT_CONTEXT)
		} catch (e) {
			this.logger.error(`Database Connection Error - ${e.message}`, APP_BOOT_CONTEXT)
			throw new Error('Database Connection Error')
		}

		const database = (await this.query.perform(
			QueryPerform.LIST_TABLES,
			{ include_system: true },
			APP_BOOT_CONTEXT,
		)) as ListTablesResponseObject

		if (!database.tables.includes(LLANA_PUBLIC_TABLES)) {
			this.logger.log(`Creating ${LLANA_PUBLIC_TABLES} schema as it does not exist`, APP_BOOT_CONTEXT)

			/**
			 * Create the _llana_public_tables schema
			 * 
			 * If you want to open tables up to the public, you can use this table to set the permissions, if you want the whole database 
			 * to be open, you can use an environment variable to skip the auth checks (recommended alongside host restrictions)
			 *
			 * |Field | Type | Details|
			 * |--------|---------|--------|
			 * |`table` | `string` | The table this rule applies to |
			 * |`access_level` | `enum` | The permission level to the public, either `READ` `WRITE` `DELETE`|
			 */

			const schema: DataSourceSchema = {
				table: LLANA_PUBLIC_TABLES,
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						nullable: false,
						required: true,
						primary_key: true,
						unique_key: true,
						foreign_key: false,
						auto_increment: true,
						extra: <ColumnExtraNumber>{
							decimal: 0,
						},
					},
					{
						field: 'table',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'access_level',
						type: DataSourceColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['READ', 'WRITE', 'DELETE'],
					},
				],
			}

			const created = await this.query.perform(QueryPerform.CREATE_TABLE, { schema }, APP_BOOT_CONTEXT)

			if (!created) {
				throw new Error(`Failed to create ${LLANA_PUBLIC_TABLES} table`)
			}

			// Example Auth Table - For example allowing external API access to see Employee data

			if (!this.authentication.skipAuth()) {
				const example_auth: any[] = [
					{
						table: 'Employee',
						access_level: RolePermission.READ,
					}
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

		if (!database.tables.includes(LLANA_ROLES_TABLE)) {
			this.logger.log(`Creating ${LLANA_ROLES_TABLE} schema as it does not exist`, APP_BOOT_CONTEXT)

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
			 * |`allowed_fields` | `string` | A comma separated list of fields that are restricted for this role |
			 */

			const schema: DataSourceSchema = {
				table: LLANA_ROLES_TABLE,
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						nullable: false,
						required: true,
						primary_key: true,
						unique_key: true,
						foreign_key: false,
						auto_increment: true,
						extra: <ColumnExtraNumber>{
							decimal: 0,
						},
					},
					{
						field: 'custom',
						type: DataSourceColumnType.BOOLEAN,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'table',
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'identity_column',
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'role',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'records',
						type: DataSourceColumnType.ENUM,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['NONE', 'READ', 'WRITE', 'DELETE'],
					},
					{
						field: 'own_records',
						type: DataSourceColumnType.ENUM,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						enums: ['NONE', 'READ', 'WRITE', 'DELETE'],
					},{
						field: 'allowed_fields',
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					}
				],
			}

			const created = await this.query.perform(QueryPerform.CREATE_TABLE, { schema }, APP_BOOT_CONTEXT)

			if (!created) {
				throw new Error('Failed to create _llana_roles table')
			}

			if (!this.authentication.skipAuth()) {
				const default_roles: DefaultRole[] = [
					{
						custom: false,
						role: 'ADMIN',
						records: RolePermission.DELETE,
					},
					{
						custom: false,
						role: 'USER',
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
						role: 'USER',
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
						role: 'USER',
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

		if (
			!database.tables.includes(LLANA_RELATION_TABLE) &&
			NON_RELATIONAL_DBS.includes(this.configService.get('database.type'))
		) {
			this.logger.log(`Creating ${LLANA_RELATION_TABLE} schema as it does not exist`, APP_BOOT_CONTEXT)

			const schema: DataSourceSchema = {
				table: LLANA_RELATION_TABLE,
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						nullable: false,
						required: true,
						primary_key: true,
						unique_key: true,
						foreign_key: false,
						auto_increment: true,
						extra: <ColumnExtraNumber>{
							decimal: 0,
						},
					},
					{
						field: 'table',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'column',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'org_table',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'org_column',
						type: DataSourceColumnType.STRING,
						nullable: false,
						required: true,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
					},
				],
			}

			const created = await this.query.perform(QueryPerform.CREATE_TABLE, { schema }, APP_BOOT_CONTEXT)

			if (!created) {
				throw new Error(`Failed to create ${LLANA_RELATION_TABLE} table`)
			}
		}

		// Check if _llana_webhook table exists

		if (!this.configService.get<boolean>('DISABLE_WEBHOOKS')) {
			if (!database.tables.includes(LLANA_WEBHOOK_TABLE)) {
				this.logger.log(`Creating ${LLANA_WEBHOOK_TABLE} schema as it does not exist`, APP_BOOT_CONTEXT)

				/**
				 * Create the _llana_webhook schema
				 */

				const schema: DataSourceSchema = {
					table: LLANA_WEBHOOK_TABLE,
					primary_key: 'id',
					columns: [
						{
							field: 'id',
							type: DataSourceColumnType.NUMBER,
							nullable: false,
							required: true,
							primary_key: true,
							unique_key: true,
							foreign_key: false,
							auto_increment: true,
							extra: <ColumnExtraNumber>{
								decimal: 0,
							},
						},
						{
							field: 'type',
							type: DataSourceColumnType.ENUM,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							enums: [Method.GET, Method.POST, Method.PUT, Method.PATCH, Method.DELETE],
						},
						{
							field: 'url',
							type: DataSourceColumnType.STRING,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
						},
						{
							field: 'table',
							type: DataSourceColumnType.STRING,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
						},
						{
							field: 'user_identifier',
							type: DataSourceColumnType.STRING,
							nullable: true,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: null,
						},
						{
							field: 'on_create',
							type: DataSourceColumnType.BOOLEAN,
							nullable: false,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: true,
						},
						{
							field: 'on_update',
							type: DataSourceColumnType.BOOLEAN,
							nullable: false,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: true,
						},
						{
							field: 'on_delete',
							type: DataSourceColumnType.BOOLEAN,
							nullable: false,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: true,
						},
					],
				}

				if (this.configService.get<string>('SOFT_DELETE_COLUMN')) {
					schema.columns.push({
						field: this.configService.get<string>('SOFT_DELETE_COLUMN'),
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						default: null,
					})
				}

				const created = await this.query.perform(QueryPerform.CREATE_TABLE, { schema }, APP_BOOT_CONTEXT)

				if (!created) {
					throw new Error('Failed to create _llana_webhook table')
				}
			}

			// Check if _llana_webhook_log table exists

			try {
				const schema = await this.schema.getSchema({
					table: LLANA_WEBHOOK_LOG_TABLE,
					x_request_id: APP_BOOT_CONTEXT,
				})

				const log_days = this.configService.get<number>('WEBHOOK_LOG_DAYS') ?? WEBHOOK_LOG_DAYS

				const minusXdays = new Date()
				minusXdays.setDate(minusXdays.getDate() - log_days)
				const records = (await this.query.perform(QueryPerform.FIND_MANY, {
					schema,
					fields: [schema.primary_key],
					where: [{ column: 'created_at', operator: WhereOperator.lt, value: minusXdays.toISOString() }],
					limit: 99999,
				})) as FindManyResponseObject

				if (records.total > 0) {
					for (const record of records.data) {
						await this.query.perform(
							QueryPerform.DELETE,
							{ schema, id: record[schema.primary_key] },
							APP_BOOT_CONTEXT,
						)
					}
					this.logger.log(
						`Deleted ${records.total} records older than ${WEBHOOK_LOG_DAYS} day(s) from ${LLANA_WEBHOOK_LOG_TABLE}`,
						APP_BOOT_CONTEXT,
					)
				}
			} catch (e) {
				this.logger.log(
					`Creating ${LLANA_WEBHOOK_LOG_TABLE} schema as it does not exist - ${e.message}`,
					APP_BOOT_CONTEXT,
				)

				/**
				 * Create the _llana_webhook_log schema
				 */

				const schema: DataSourceSchema = {
					table: LLANA_WEBHOOK_LOG_TABLE,
					primary_key: 'id',
					columns: [
						{
							field: 'id',
							type: DataSourceColumnType.NUMBER,
							nullable: false,
							required: true,
							primary_key: true,
							unique_key: true,
							foreign_key: false,
							auto_increment: true,
							extra: <ColumnExtraNumber>{
								decimal: 0,
							},
						},
						{
							field: 'webhook_id',
							type: DataSourceColumnType.NUMBER,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: true,
							auto_increment: false,
							extra: <ColumnExtraNumber>{
								decimal: 0,
							},
						},
						{
							field: 'type',
							type: DataSourceColumnType.ENUM,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							enums: [PublishType.INSERT, PublishType.UPDATE, PublishType.DELETE],
						},
						{
							field: 'url',
							type: DataSourceColumnType.STRING,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
						},
						{
							field: 'record_key',
							type: DataSourceColumnType.STRING,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
						},
						{
							field: 'record_id',
							type: DataSourceColumnType.STRING,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
						},
						{
							field: 'attempt',
							type: DataSourceColumnType.NUMBER,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: 1,
							extra: <ColumnExtraNumber>{
								decimal: 0,
							},
						},
						{
							field: 'delivered',
							type: DataSourceColumnType.BOOLEAN,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: false,
						},
						{
							field: 'response_status',
							type: DataSourceColumnType.NUMBER,
							nullable: true,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: null,
							extra: <ColumnExtraNumber>{
								decimal: 0,
							},
						},
						{
							field: 'response_message',
							type: DataSourceColumnType.STRING,
							nullable: true,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: null,
						},
						{
							field: 'created_at',
							type: DataSourceColumnType.DATE,
							nullable: false,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: 'CURRENT_TIMESTAMP',
						},
						{
							field: 'next_attempt_at',
							type: DataSourceColumnType.DATE,
							nullable: true,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: 'CURRENT_TIMESTAMP',
						},
						{
							field: 'delivered_at',
							type: DataSourceColumnType.DATE,
							nullable: true,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: null,
						},
					],
					relations: [
						{
							table: LLANA_WEBHOOK_LOG_TABLE,
							column: 'webhook_id',
							org_table: LLANA_WEBHOOK_TABLE,
							org_column: 'id',
						},
					],
				}

				const created = await this.query.perform(QueryPerform.CREATE_TABLE, { schema }, APP_BOOT_CONTEXT)

				if (!created) {
					throw new Error('Failed to create _llana_webhook_log table')
				}
			}
		} else {
			this.logger.warn('Skipping webhooks as DISABLE_WEBHOOKS is set to true', APP_BOOT_CONTEXT)
		}

		if (this.authentication.skipAuth()) {
			this.logger.warn(
				'Skipping auth is set to true, you should maintain _llana_public_tables table for any WRITE permissions',
				APP_BOOT_CONTEXT,
			)
		}

		if (this.documentation.skipDocs()) {
			this.logger.warn('Skipping docs is set to true', APP_BOOT_CONTEXT)
		} else {
			const docs = await this.documentation.generateDocumentation()

			//write docs to file to be consumed by the UI

			this.logger.log('Docs Generated', APP_BOOT_CONTEXT)
			fs.writeFileSync('openapi.json', JSON.stringify(docs))
		}

		this.logger.log('Application Bootstrapping Complete', APP_BOOT_CONTEXT)
	}
}
