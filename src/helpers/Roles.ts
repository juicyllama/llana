import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { LLANA_ROLES_TABLE } from '../app.constants'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from '../types/auth.types'
import { DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
import { FindManyResponseObject } from '../types/response.types'
import { RolePermission, RolesConfig } from '../types/roles.types'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

@Injectable()
export class Roles {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	/**
	 * Check if a role has permission to access a table
	 */

	async tablePermission(
		identifier: string,
		table: string,
		access: RolePermission,
	): Promise<AuthTablePermissionSuccessResponse | AuthTablePermissionFailResponse> {
		const config = this.configService.get<RolesConfig>('roles')

		if (!config.location?.table || !config.location?.column) {
			this.logger.warn('Roles table not defined, skipping role check')
			return <AuthTablePermissionSuccessResponse>{
				valid: true,
			}
		}

		const schema = await this.schema.getSchema(table)

		if(!schema) {
			return <AuthTablePermissionFailResponse>{
				valid: false,
				message: 'Table not found',
			}
		}

		let role

		try {
			role = await this.getRole(identifier)
		} catch (e) {
			return <AuthTablePermissionFailResponse>{
				valid: false,
				message: e.message,
			}
		}

		if (!role) {
			return <AuthTablePermissionFailResponse>{
				valid: false,
				message: 'Role not found',
			}
		}

		const permission_schema = await this.schema.getSchema(LLANA_ROLES_TABLE)

		const custom_permissions = (await this.query.perform(QueryPerform.FIND_MANY, {
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
					value: table,
				},
				{
					column: 'role',
					operator: WhereOperator.equals,
					value: role,
				},
			],
		})) as FindManyResponseObject

		// check if there is a table role setting
		if (custom_permissions.data?.length) {
			for (const permission of custom_permissions.data) {

				if (this.rolePass(access, permission.records)) {
					return {
						valid: true,
					}
				}

				if (this.rolePass(access, permission.own_records)) {
					return {
						valid: true,
						restriction: {
							column: permission.identity_column ?? schema.primary_key,
							operator: WhereOperator.equals,
							value: identifier,
						},
					}
				}
			}
		}

		const default_permissions = (await this.query.perform(QueryPerform.FIND_MANY, {
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
		})) as FindManyResponseObject

		if (default_permissions.data?.length) {
			for (const permission of default_permissions.data) {
				if (this.rolePass(access, permission.records)) {
					return {
						valid: true,
					}
				}
			}
		}

		return <AuthTablePermissionFailResponse>{
			valid: false,
			message: `Table Action ${access} - Permission Denied For Role ${role}`,
		}
	}

	/**
	 * Get users role from the database
	 */

	private async getRole(identifier: string): Promise<string | undefined> {
		const config = this.configService.get<RolesConfig>('roles')

		let table_schema

		try {
			table_schema = await this.schema.getSchema(config.location.table)
		} catch (e) {
			throw new Error(e)
		}

		const user_id_column = config.location?.identifier_column ?? table_schema.primary_key

		const role = await this.query.perform(QueryPerform.FIND, {
			schema: table_schema,
			fields: [config.location.column],
			where: [
				{
					column: user_id_column,
					operator: WhereOperator.equals,
					value: identifier,
				},
			],
			joins: true,
		})

		return role?.[config.location.column]
	}

	private rolePass(access: RolePermission, permission: RolePermission): boolean {
		switch (access) {
			case RolePermission.NONE:
				return false
			case RolePermission.READ:
				return (
					permission === RolePermission.READ ||
					permission === RolePermission.WRITE ||
					permission === RolePermission.DELETE
				)
			case RolePermission.WRITE:
				return permission === RolePermission.WRITE || permission === RolePermission.DELETE
			case RolePermission.DELETE:
				return permission === RolePermission.DELETE
		}
	}
}
