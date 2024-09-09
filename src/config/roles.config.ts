import { registerAs } from '@nestjs/config'

import { RoleLocation, RolesConfig } from '../types/roles.types'

export default registerAs(
	'roles',
	() =>
		<RolesConfig>{
			location: <RoleLocation>{
				table: process.env.ROLE_LOCATION_USER_TABLE_NAME ?? process.env.AUTH_USER_TABLE_NAME ?? 'User',
				column: process.env.ROLE_LOCATION_USER_TABLE_ROLE_FIELD ?? 'role',
				identifier_column: process.env.ROLE_LOCATION_USER_TABLE_IDENTITY_COLUMN ?? undefined,
			},
		},
)
