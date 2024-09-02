import { registerAs } from '@nestjs/config'
import { Role, RoleLocation, RolePermission, RoleProfiles, RolesConfig, TableRole } from '../types/roles.types'

export default registerAs('roles', () => (<RolesConfig>{
	location: <RoleLocation>{
		table: 'users',
		column: 'role'
	},
	defaults: <Role[]>[{
		role: "ADMIN",
		records: RolePermission.DELETE,
	},
	{
		role: "EDITOR",
		records: RolePermission.WRITE,
	},
	{
		role: "VIEWER",
		records: RolePermission.READ,
	}],
	profiles: <RoleProfiles[]>[{
		tables: [{
			table: 'users',
		},{
			table: 'user_api_keys',
			identity_column: 'user_id'
		}],
		roles: <TableRole[]>[{
			role: "ADMIN",
			own_records: RolePermission.DELETE,
			records: RolePermission.DELETE,
		},
		{
			role: "EDITOR",
			own_records: RolePermission.WRITE,
			records: RolePermission.NONE,
		},
		{
			role: "VIEWER",
			own_records: RolePermission.WRITE,
			records: RolePermission.NONE,
		}],
	},{
		tables: [{
			table: 'clients',
			identity_column: 'clients.users_clients.user_id'
		}],
		roles: <TableRole[]>[{
			role: "ADMIN",
			own_records: RolePermission.WRITE,
			records: RolePermission.NONE,
		},{
			role: "EDITOR",
			own_records: RolePermission.READ,
			records: RolePermission.NONE,
		},{
			role: "VIEWER",
			own_records: RolePermission.READ,
			records: RolePermission.NONE,
		}]
	}]
}))
