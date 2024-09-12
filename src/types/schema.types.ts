import { DatabaseRelations, DatabaseWhere } from './database.types'

export interface ValidateFieldsResponse extends ValidateResponse {
	fields?: string[]
	relations?: DatabaseRelations[]
}

export interface validateRelationsResponse extends ValidateResponse {
	relations?: DatabaseRelations[]
}

export interface validateWhereResponse extends ValidateResponse {
	where?: DatabaseWhere[]
}

export interface ValidateSortResponse extends ValidateResponse {
	sort?: SortCondition[]
}

export interface ValidateResponse {
	valid: boolean
	message?: string
}

export interface SortCondition {
	column: string
	operator: 'ASC' | 'DESC'
}
