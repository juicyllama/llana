import { registerAs } from '@nestjs/config'
import { Role, RoleLocation, RolePermission, RoleProfiles, RolesConfig, TableRole } from '../types/roles.types'

export default registerAs(
	'roles',
	() =>
		<RolesConfig>{
			location: <RoleLocation>{
				table: 'User',
				column: 'role',
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
							table: 'User',
						},
						{
							table: 'UserApiKey',
							identity_column: 'userId',
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
