import { DatabaseSchema, DatabaseWhere } from './database.types'

export interface ValidateFieldsResponse extends ValidateResponse {
	params?: string[]
	relations?: string[]
}

export interface validateRelationsResponse extends ValidateResponse {
	schema?: DatabaseSchema
}

export interface validateWhereResponse extends ValidateResponse {
	where?: DatabaseWhere[]
}

export interface ValidateResponse {
	valid: boolean
	message?: string
}

export interface SortCondition {
	column: string
	operator: 'ASC' | 'DESC'
}
