import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cache } from 'cache-manager'

import { CACHE_DEFAULT_IDENTITY_DATA_TTL, LLANA_ROLES_TABLE } from '../app.constants'
import { FindManyResponseObject } from '../dtos/response.dto'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from '../types/auth.types'
import { QueryPerform, WhereOperator } from '../types/datasource.types'
import { RolePermission, RolesConfig } from '../types/roles.types'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

@Injectable()
export class Roles {
	constructor(
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	/**
	 * Check if a role has permission to access a table
	 */

	async tablePermission(options: {
		identifier: string
		table: string
		access: RolePermission
		x_request_id: string
	}): Promise<AuthTablePermissionSuccessResponse | AuthTablePermissionFailResponse> {
		const config = this.configService.get<RolesConfig>('roles')

		if (!config.location?.table || !config.location?.column) {
			this.logger.warn('Roles table not defined, skipping role check')
			return <AuthTablePermissionSuccessResponse>{
				valid: true,
			}
		}

		let permission_result = await this.cacheManager.get<
			AuthTablePermissionSuccessResponse | AuthTablePermissionFailResponse
		>(`roles:${options.identifier}:${options.table}:${options.access}`)

		if (permission_result?.valid) {
			return permission_result
		}

		const schema = await this.schema.getSchema({ table: options.table, x_request_id: options.x_request_id })

		if (!schema) {
			permission_result = <AuthTablePermissionFailResponse>{
				valid: false,
				message: 'Table not found',
			}
			await this.cacheManager.set(
				`roles:${options.identifier}:${options.table}:${options.access}`,
				permission_result,
				CACHE_DEFAULT_IDENTITY_DATA_TTL,
			)
			return permission_result
		}

		let role

		try {
			role = await this.getRole(options.identifier, options.x_request_id)
		} catch (e) {
			permission_result = <AuthTablePermissionFailResponse>{
				valid: false,
				message: e.message,
			}
			await this.cacheManager.set(
				`roles:${options.identifier}:${options.table}:${options.access}`,
				permission_result,
				CACHE_DEFAULT_IDENTITY_DATA_TTL,
			)
			return permission_result
		}

		if (!role) {
			permission_result = <AuthTablePermissionFailResponse>{
				valid: false,
				message: 'Role not found',
			}
			await this.cacheManager.set(
				`roles:${options.identifier}:${options.table}:${options.access}`,
				permission_result,
				CACHE_DEFAULT_IDENTITY_DATA_TTL,
			)
			return permission_result
		}

		const permission_schema = await this.schema.getSchema({
			table: LLANA_ROLES_TABLE,
			x_request_id: options.x_request_id,
		})

		const custom_permissions = (await this.query.perform(
			QueryPerform.FIND_MANY,
			{
				schema: permission_schema,
				where: [
					{
						column: 'custom',
						operator: WhereOperator.equals,
						value: true,
					},
					{
						column: 'table',
						operator: WhereOperator.equals,
						value: options.table,
					},
					{
						column: 'role',
						operator: WhereOperator.equals,
						value: role,
					},
				],
			},
			options.x_request_id,
		)) as FindManyResponseObject

		// check if there is a table role setting
		if (custom_permissions.data?.length) {
			for (const permission of custom_permissions.data) {
				if (this.rolePass(options.access, permission.records)) {
					permission_result = <AuthTablePermissionSuccessResponse>{
						valid: true,
						restricted_fields:
							permission.records === RolePermission.READ_RESTRICTED ||
							permission.records === RolePermission.WRITE_RESTRICTED
								? permission.restricted_fields?.split(',')
								: undefined,
					}
					await this.cacheManager.set(
						`roles:${options.identifier}:${options.table}:${options.access}`,
						permission_result,
						CACHE_DEFAULT_IDENTITY_DATA_TTL,
					)
					return permission_result
				}

				if (this.rolePass(options.access, permission.own_records)) {
					permission_result = <AuthTablePermissionSuccessResponse>{
						valid: true,
						restricted_fields:
							permission.own_records === RolePermission.READ_RESTRICTED ||
							permission.own_records === RolePermission.WRITE_RESTRICTED
								? permission.restricted_fields?.split(',')
								: undefined,
						restriction: {
							column: permission.identity_column ?? schema.primary_key,
							operator: WhereOperator.equals,
							value: options.identifier,
						},
					}
					await this.cacheManager.set(
						`roles:${options.identifier}:${options.table}:${options.access}`,
						permission_result,
						CACHE_DEFAULT_IDENTITY_DATA_TTL,
					)
					return permission_result
				}
			}
		}

		const default_permissions = (await this.query.perform(
			QueryPerform.FIND_MANY,
			{
				schema: permission_schema,
				where: [
					{
						column: 'custom',
						operator: WhereOperator.equals,
						value: false,
					},
					{
						column: 'role',
						operator: WhereOperator.equals,
						value: role,
					},
				],
			},
			options.x_request_id,
		)) as FindManyResponseObject

		if (default_permissions.data?.length) {
			for (const permission of default_permissions.data) {
				if (this.rolePass(options.access, permission.records)) {
					permission_result = <AuthTablePermissionSuccessResponse>{
						valid: true,
						restricted_fields:
							permission.records === RolePermission.READ_RESTRICTED ||
							permission.records === RolePermission.WRITE_RESTRICTED
								? permission.restricted_fields?.split(',')
								: undefined,
					}
					await this.cacheManager.set(
						`roles:${options.identifier}:${options.table}:${options.access}`,
						permission_result,
						CACHE_DEFAULT_IDENTITY_DATA_TTL,
					)
					return permission_result
				}
			}
		}

		permission_result = <AuthTablePermissionFailResponse>{
			valid: false,
			message: `Table Action ${options.access} - Permission Denied For Role ${role}`,
		}
		await this.cacheManager.set(
			`roles:${options.identifier}:${options.table}:${options.access}`,
			permission_result,
			CACHE_DEFAULT_IDENTITY_DATA_TTL,
		)
		return permission_result
	}

	/**
	 * Get users role from the database
	 */

	private async getRole(identifier: string, x_request_id: string): Promise<string | undefined> {
		const config = this.configService.get<RolesConfig>('roles')

		let table_schema

		try {
			table_schema = await this.schema.getSchema({ table: config.location.table, x_request_id })
		} catch (e) {
			throw new Error(e)
		}

		const user_id_column = config.location?.identifier_column ?? table_schema.primary_key

		const role = await this.query.perform(
			QueryPerform.FIND_ONE,
			{
				schema: table_schema,
				fields: [config.location.column],
				where: [
					{
						column: user_id_column,
						operator: WhereOperator.equals,
						value: identifier,
					},
				],
			},
			x_request_id,
		)

		return role?.[config.location.column]
	}

	rolePass(access: RolePermission, permission: RolePermission): boolean {
		switch (access) {
			case RolePermission.NONE:
				return false
			case RolePermission.READ:
				return (
					permission === RolePermission.READ ||
					permission === RolePermission.READ_RESTRICTED ||
					permission === RolePermission.WRITE ||
					permission === RolePermission.WRITE_RESTRICTED ||
					permission === RolePermission.DELETE
				)
			case RolePermission.READ_RESTRICTED:
				return (
					permission === RolePermission.READ_RESTRICTED ||
					permission === RolePermission.WRITE ||
					permission === RolePermission.WRITE_RESTRICTED ||
					permission === RolePermission.DELETE
				)
			case RolePermission.WRITE:
				return permission === RolePermission.WRITE || permission === RolePermission.DELETE
			case RolePermission.WRITE_RESTRICTED:
				return permission === RolePermission.WRITE_RESTRICTED || permission === RolePermission.DELETE
			case RolePermission.DELETE:
				return permission === RolePermission.DELETE
		}
	}
}
