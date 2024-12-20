export enum RolePermission {
	NONE = 'NONE',
	READ = 'READ',
	READ_RESTRICTED = 'READ_RESTRICTED',
	WRITE = 'WRITE',
	WRITE_RESTRICTED = 'WRITE_RESTRICTED',
	DELETE = 'DELETE',
}

export interface TableRole extends Role {
	own_records: RolePermission
}

export interface Role {
	id?: number // the id of the role after creation
	custom: boolean
	role: string
	records: RolePermission
}

export interface DefaultRole extends Role {}

export interface CustomRole extends Role {
	table: string // the table you want to apply the roles to
	own_records?: RolePermission
	identity_column?: string // the column in the table which holds the user identity (e.g. user_id), if not provided, we will use the tables primary key
}

export interface RoleLocation {
	table: string //the table which holds the users role information
	column: string //the column in the table which holds the users role
	identifier_column?: string // the column in the table which holds the user identity (e.g. user_id), if not provided, we will use the tables primary key
}

export interface RolesConfig {
	location: RoleLocation
}
