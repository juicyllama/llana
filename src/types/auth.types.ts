import { DatabaseWhere, WhereOperator } from './database.types'

export interface Auth {
	type: AuthType
	location: AuthLocation
	name: string
	routes?: {
		include?: string[]
		exclude?: string[]
	}
	table: AuthAPIKey | AuthJWT
}

export enum AuthType {
	APIKEY = 'APIKEY',
	JWT = 'JWT',
}

export enum AuthLocation {
	HEADER = 'HEADER',
	QUERY = 'QUERY',
	BODY = 'BODY',
}

export interface AuthAPIKey extends AuthTableSettings {
	column: string
}

export interface AuthJWT extends AuthTableSettings {
	columns: {
		username: string
		password: string
	}
	password: {
		encryption: AuthPasswordEncryption
		salt?: string
	}
}

export interface AuthTableSettings {
	name: string
	where?: {
		column: string
		operator: WhereOperator
		value?: string
	}[]
	identity_column?: string // If your identity column is not the table primary key
}

export enum AuthPasswordEncryption {
	BCRYPT = 'BCRYPT',
	SHA1 = 'SHA1',
	SHA256 = 'SHA256',
	SHA512 = 'SHA512',
	MD5 = 'MD5',
	ARGON2 = 'ARGON2',
}

export interface AuthRestrictionsResponse {
	valid: boolean
	message?: string
	user_identifier?: string
}

export interface AuthTablePermissionSuccessResponse extends AuthTablePermissionResponse {
	restriction?: DatabaseWhere
}

export interface AuthTablePermissionFailResponse extends AuthTablePermissionResponse {
	message: string
}

export interface AuthTablePermissionResponse {
	valid: boolean
}
