import { DataSourceRelations, DataSourceWhere } from './datasource.types'

export interface ValidateFieldsResponse extends ValidateResponse {
	fields?: string[]
	relations?: DataSourceRelations[]
}

export interface validateRelationsResponse extends ValidateResponse {
	relations?: DataSourceRelations[]
}

export interface validateWhereResponse extends ValidateResponse {
	where?: DataSourceWhere[]
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
