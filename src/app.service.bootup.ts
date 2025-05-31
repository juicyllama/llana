import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cache } from 'cache-manager'
import * as fs from 'fs'

import {
	APP_BOOT_CONTEXT,
	LLANA_DATA_CACHING_TABLE,
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
import {
	ColumnExtraNumber,
	ColumnExtraString,
	DataSourceColumnType,
	DataSourceSchema,
	DataSourceType,
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
		await this.cacheManager.clear()

		try {
			await this.query.perform(QueryPerform.CHECK_CONNECTION, undefined, APP_BOOT_CONTEXT)
			this.logger.log('Database Connection Successful', APP_BOOT_CONTEXT)

			if (this.configService.get<string>('database.type') === DataSourceType.POSTGRES) {
				this.logger.log('Resetting PostgreSQL sequences', APP_BOOT_CONTEXT)
				await this.query.perform(QueryPerform.RESET_SEQUENCES, undefined, APP_BOOT_CONTEXT)
			}
		} catch (e) {
			this.logger.error(`Database Connection Error - ${e.message}`, APP_BOOT_CONTEXT)

			if (process.env.NODE_ENV === 'test') {
				this.logger.warn('Continuing in test environment despite database connection error', APP_BOOT_CONTEXT)
				return // Skip the rest of the bootstrap process in test environment
			} else {
				throw new Error('Database Connection Error')
			}
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
			 * |`allowed_fields` | `string` | A comma separated list of fields that are restricted for this role |
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
					{
						field: 'allowed_fields',
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						extra: <ColumnExtraString>{
							length: 1020,
						},
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
				throw new Error(`Failed to create ${LLANA_PUBLIC_TABLES} table`)
			}

			// Example Public Tables - For example allowing external API access to see Employee data

			if (!this.authentication.skipAuth()) {
				const example_auth: any[] = [
					{
						table: 'Employee',
						access_level: RolePermission.READ,
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
					},
					{
						field: 'allowed_fields',
						type: DataSourceColumnType.STRING,
						nullable: true,
						required: false,
						primary_key: false,
						unique_key: false,
						foreign_key: false,
						extra: <ColumnExtraString>{
							length: 1020,
						},
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
						role: 'USER',
						table: this.authentication.getIdentityTable(),
						records: RolePermission.NONE,
						own_records: RolePermission.WRITE,
					},
					{
						custom: true,
						role: 'USER',
						table: this.configService.get<string>('AUTH_USER_API_KEY_TABLE_NAME') ?? 'UserApiKey',
						identity_column:
							this.configService.get<string>('AUTH_USER_API_KEY_TABLE_IDENTITY_COLUMN') ?? 'userId',
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
				throw new Error(`Failed to create ${LLANA_RELATION_TABLE} table`)
			}
		}

		// Check if _llana_data_caching table is required

		if (this.configService.get<boolean>('USE_DATA_CACHING')) {
			if (!database.tables.includes(LLANA_DATA_CACHING_TABLE)) {
				this.logger.log(`Creating ${LLANA_DATA_CACHING_TABLE} schema as it does not exist`, APP_BOOT_CONTEXT)

				/**
				 * Create the _llana_data_caching schema
				 */

				const schema: DataSourceSchema = {
					table: LLANA_DATA_CACHING_TABLE,
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
							field: 'request',
							type: DataSourceColumnType.STRING,
							nullable: false,
							required: true,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
						},
						{
							field: 'ttl_seconds',
							type: DataSourceColumnType.NUMBER,
							nullable: false,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: 3600,
						},
						{
							field: 'expires_at',
							type: DataSourceColumnType.DATE,
							nullable: true,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: null,
						},
						{
							field: 'refreshed_at',
							type: DataSourceColumnType.DATE,
							nullable: true,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: null,
						},
						{
							field: 'data_changed_at',
							type: DataSourceColumnType.DATE,
							nullable: true,
							required: false,
							primary_key: false,
							unique_key: false,
							foreign_key: false,
							default: null,
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
					throw new Error(`Failed to create ${LLANA_DATA_CACHING_TABLE} table`)
				}

				const example_data_caching: any[] = [
					{
						table: 'Employee',
						request: '?fields=firstName,lastName&limit=10',
						ttl_seconds: 3600,
						expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
						refreshed_at: new Date(Date.now()).toISOString(),
						data_changed_at: new Date(Date.now()).toISOString(),
					},
				]

				for (const example of example_data_caching) {
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
		} else {
			this.logger.log('Skipping table caching as USE_DATA_CACHING is not set', APP_BOOT_CONTEXT)
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

				try {
					const created = await this.query.perform(QueryPerform.CREATE_TABLE, { schema }, APP_BOOT_CONTEXT)
					
					if (!created && process.env.NODE_ENV !== 'test') {
						throw new Error('Failed to create _llana_webhook_log table')
					}
				} catch (e) {
					if (process.env.NODE_ENV === 'test') {
						this.logger.warn(`Skipping webhook log table creation in test environment: ${e.message}`, APP_BOOT_CONTEXT)
					} else {
						throw e
					}
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
