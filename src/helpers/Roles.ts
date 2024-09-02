import { Injectable, Req } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Logger } from './Logger'
import { Query } from './Query'
import { WhereOperator } from '../types/database.types'
import { Schema } from './Schema'
import { RolePermission, RolesConfig } from '../types/roles.types'
import { AuthTablePermissionFailResponse, AuthTablePermissionSuccessResponse } from '../types/auth.types'

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

	async tablePermission(identifier: string, table: string, access: RolePermission): Promise<AuthTablePermissionSuccessResponse | AuthTablePermissionFailResponse> {
		
		const config = this.configService.get<RolesConfig>('roles')

		if(!config.location?.table || !config.location?.column) {
			this.logger.warn('Roles not defined, skipping role check')
			return <AuthTablePermissionSuccessResponse>{
				valid: true,
			}
		}

		const role = await this.getRole(identifier)

		if(!role) {
			return <AuthTablePermissionFailResponse>{
				valid: false,
				message: 'Role not found'
			}
		}

		const table_permissions = config.profiles.find((p) => p.tables.find((t) => t.table === table && p.roles.find((r) => r.role === role)))
		const default_permissions = config.defaults.find((r) => r.role === role)
		
		// check if there is a table role setting
		if(table_permissions) {

			if(this.rolePass(access, table_permissions.roles.find((r) => r.role === role)?.records)) {
				return {
					valid: true,
				}
			}

			if(this.rolePass(access, table_permissions.roles.find((r) => r.role === role)?.own_records)) {

				const schema = await this.schema.getSchema(table)

				return {
					valid: true,
					restriction: {
						column: table_permissions.tables.find((t) => t.table === table)?.identity_column ?? schema.primary_key,
						operator: WhereOperator.equals,
						value: identifier
					}
				}
			}
		}

		else if(default_permissions) {	
			if(this.rolePass(access, default_permissions.records)) {
				return {
					valid: true,
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

	async getRole(identifier: string): Promise<string | undefined> {
		const config = this.configService.get<RolesConfig>('roles')

		if(!config?.location?.table || !config?.location?.column) {
			this.logger.error('Role location not defined')
			return
		}

		const table_schema = await this.schema.getSchema(config.location.table)

		const user_id_column = config.location?.identifier_column ?? table_schema.primary_key

		const role = await this.query.findOne({
			schema: table_schema, 
			fields: config.location.column,
			where: [{
				column: user_id_column,
				operator: WhereOperator.equals,
				value: identifier
			}],
			joins: true
		})

		console.log(role)

		return role?.[config.location.column]
	}

	rolePass(access: RolePermission, permission: RolePermission): boolean {

		switch(access) {
			case RolePermission.NONE:
				return false
			case RolePermission.READ:
				return permission === RolePermission.READ || permission === RolePermission.WRITE || permission === RolePermission.DELETE
			case RolePermission.WRITE:
				return permission === RolePermission.WRITE || permission === RolePermission.DELETE
			case RolePermission.DELETE:
				return permission === RolePermission.DELETE
		}

	}

}
