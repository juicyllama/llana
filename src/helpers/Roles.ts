import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cache } from 'cache-manager'

import { CACHE_DEFAULT_IDENTITY_DATA_TTL, LLANA_ROLES_TABLE } from '../app.constants'
import { FindManyResponseObject } from '../dtos/response.dto'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from '../types/auth.types'
import { QueryPerform, WhereOperator } from '../types/datasource.types'
import { RolePermission, RolesConfig } from '../types/roles.types'
import { Env } from '../utils/Env'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'
import { S } from '@faker-js/faker/dist/airline-BnpeTvY9'

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
	 * * Pull from cache if available
	 * * Get the users role
	 * * Check if the role has custom permissions for the table
	 * * Check if the role has default permissions set
	 * * Return the result
	 */

	async tablePermission(options: {
		identifier: string
		table: string
		access: RolePermission
		x_request_id: string
		data?: any //Used for Create and Update to check if the user has permission to update the record
	}): Promise<AuthTablePermissionSuccessResponse | AuthTablePermissionFailResponse> {
		const config = this.configService.get<RolesConfig>('roles')

		if (!config.location?.table || !config.location?.column) {
			this.logger.warn('Roles table not defined, skipping role check')
			return <AuthTablePermissionSuccessResponse>{
				valid: true,
			}
		}

		let permission_result

		if (Env.IsNotTest()) {
			permission_result = await this.cacheManager.get<
				AuthTablePermissionSuccessResponse | AuthTablePermissionFailResponse
			>(`roles:${options.identifier}:${options.table}:${options.access}`)
		}

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
				if (comparePermissions(permission.records, options.access)) {
					permission_result = <AuthTablePermissionSuccessResponse>{
						valid: true,
						allowed_fields: this.formatAllowedFields(permission.allowed_fields),
					}
					await this.cacheManager.set(
						`roles:${options.identifier}:${options.table}:${options.access}`,
						permission_result,
						CACHE_DEFAULT_IDENTITY_DATA_TTL,
					)
					return permission_result
				}

				if (!comparePermissions(permission.own_records, options.access)) {
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
				} else if (
					options.data &&
					options.data[permission.identity_column ?? schema.primary_key] !== options.identifier
				) {
					permission_result = <AuthTablePermissionFailResponse>{
						valid: false,
						message: `Identity Mismatch - You can only add ${options.table} records with your own ${permission.identity_column ?? schema.primary_key} (${options.identifier}) but you are trying to add ${options.data[permission.identity_column ?? schema.primary_key]}`,
					}
					await this.cacheManager.set(
						`roles:${options.identifier}:${options.table}:${options.access}`,
						permission_result,
						CACHE_DEFAULT_IDENTITY_DATA_TTL,
					)
					return permission_result
				}

				if (comparePermissions(permission.own_records, options.access)) {
					permission_result = <AuthTablePermissionSuccessResponse>{
						valid: true,
						restriction: {
							column: permission.identity_column ?? schema.primary_key,
							operator: WhereOperator.equals,
							value: options.identifier,
						},
						allowed_fields: this.formatAllowedFields(permission.allowed_fields),
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
				if (comparePermissions(permission.records, options.access)) {
					permission_result = <AuthTablePermissionSuccessResponse>{
						valid: true,
						allowed_fields: this.formatAllowedFields(permission.allowed_fields),
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

	/**
	 * Process allowed fields from the role permission
	 */

	private formatAllowedFields(allowed_fields: string): string[] {
		if (!allowed_fields) {
			return []
		}

		return allowed_fields.split(',').map((field) => field.trim())
	}
}
/**
 *
 * @param permission level being requested (e.g. user permission)
 * @param access level required (e.g. delete endpoint is DELETE)
 * @returns
 */
export function comparePermissions(permission: RolePermission, access: RolePermission): boolean {
	let passed = false

	switch (access) {
		case RolePermission.DELETE:
			passed = permission === RolePermission.DELETE
			break
		case RolePermission.WRITE:
			passed = permission === RolePermission.WRITE || permission === RolePermission.DELETE
			break
		case RolePermission.READ:
			passed =
				permission === RolePermission.READ ||
				permission === RolePermission.WRITE ||
				permission === RolePermission.DELETE
			break
		case RolePermission.NONE:
			passed = false
			break
	}
	return passed
}
