import { registerAs } from '@nestjs/config'

import { Role, RoleLocation, RolePermission, RoleProfiles, RolesConfig, TableRole } from '../types/roles.types'

export default registerAs(
	'roles',
	() =>
		<RolesConfig>{
			location: <RoleLocation>{
				table: process.env.ROLE_LOCATION_USER_TABLE_NAME ?? 'User',
				column: process.env.ROLE_LOCATION_USER_TABLE_ROLE_FIELD ?? 'role',
			},
			defaults: <Role[]>[
				{
					role: 'ADMIN',
					records: RolePermission.DELETE,
				},
				{
					role: 'EDITOR',
					records: RolePermission.WRITE,
				},
				{
					role: 'VIEWER',
					records: RolePermission.READ,
				},
			],
			profiles: <RoleProfiles[]>[
				{
					tables: [
						{
							table: process.env.AUTH_USER_TABLE_NAME ?? 'User',
						},
						{
							table: process.env.AUTH_USER_API_KEY_TABLE_NAME ?? 'UserApiKey',
							identity_column: process.env.AUTH_USER_API_KEY_TABLE_IDENTITY_COLUMN ?? 'userId',
						},
					],
					roles: <TableRole[]>[
						{
							role: 'ADMIN',
							own_records: RolePermission.DELETE,
							records: RolePermission.DELETE,
						},
						{
							role: 'EDITOR',
							own_records: RolePermission.WRITE,
							records: RolePermission.NONE,
						},
						{
							role: 'VIEWER',
							own_records: RolePermission.WRITE,
							records: RolePermission.NONE,
						},
					],
				},
			],
		},
)
