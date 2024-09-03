export enum RolePermission {
	NONE = 'NONE',
	READ = 'READ',
	WRITE = 'WRITE',
	DELETE = 'DELETE',
}

export interface TableRole extends Role {
	own_records: RolePermission
}

export interface Role {
	role: string
	records: RolePermission
}

export interface RoleLocation {
	table: string //the table which holds the users role information
	column: string //the column in the table which holds the users role
	identifier_column?: string // the column in the table which holds the user identity (e.g. user_id), if not provided, we will use the tables primary key
}

export interface TableRoleSettings {
	table: string // the table you want to apply the roles to
	identity_column?: string // the column in the table which holds the user identity (e.g. user_id), if not provided, we will use the tables primary key
}

export interface RoleProfiles {
	tables: TableRoleSettings[]
	roles: TableRole[]
}

export interface RolesConfig {
	location: RoleLocation
	defaults?: Role[]
	profiles?: RoleProfiles[]
}
