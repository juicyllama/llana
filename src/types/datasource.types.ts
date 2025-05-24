import { SortCondition } from './schema.types'

export enum DataSourceType {
	MYSQL = 'mysql',
	POSTGRES = 'postgres',
	MONGODB = 'mongodb',
	MSSQL = 'mssql',
	AIRTABLE = 'airtable',
}

export enum DataSourceNaming {
	snake_case = 'snake_case',
	camelCase = 'camelCase',
}

export enum QueryPerform {
	CREATE = 'create',
	FIND_ONE = 'find',
	FIND_MANY = 'findMany',
	UPDATE = 'update',
	DELETE = 'delete',
	UNIQUE = 'unique',
	TRUNCATE = 'truncate',
	CREATE_TABLE = 'createTable',
	CHECK_CONNECTION = 'checkConnection',
	LIST_TABLES = 'listTables',
	RESET_SEQUENCES = 'resetSequences',
}

export enum PublishType {
	INSERT = 'INSERT',
	UPDATE = 'UPDATE',
	DELETE = 'DELETE',
}

export enum WhereOperator {
	equals = '=',
	not_equals = '!=',
	lt = '<',
	lte = '<=',
	gt = '>',
	gte = '>=',
	like = 'LIKE',
	not_like = 'NOT LIKE',
	in = 'IN',
	not_in = 'NOT IN',
	null = 'IS NULL',
	not_null = 'IS NOT NULL',
	search = 'SEARCH',
}

export enum DataSourceColumnType {
	STRING = 'string',
	NUMBER = 'number',
	BOOLEAN = 'boolean',
	DATE = 'date',
	JSON = 'json',
	ENUM = 'enum',
	UNKNOWN = 'unknown',
}

export enum ImportMode {
	CREATE = 'CREATE',
	UPSERT = 'UPSERT',
	DELETE = 'DELETE',
	REPOPULATE = 'REPOPULATE',
}

export declare enum ChartsPeriod {
	MIN = 'MIN',
	'15MIN' = '15MIN',
	'30MIN' = '30MIN',
	HOUR = 'HOUR',
	DAY = 'DAY',
	WEEK = 'WEEK',
	MONTH = 'MONTH',
	YEAR = 'YEAR',
}

export interface ChartResult {
	count: number
	[key: string]: any
	time_interval: Date
}

export interface DataSourceSchema {
	table: string
	primary_key: string
	columns: DataSourceSchemaColumn[]
	relations?: DataSourceSchemaRelation[]
	_x_request_id?: string
}

export interface DataSourceWhere {
	column: string
	operator: WhereOperator
	value?: any
}

export interface ColumnExtraNumber {
	decimal: number // Number of decimal places
}

export interface ColumnExtraString {
	length: number // Size of the string field
}

export interface DataSourceSchemaColumn {
	field: string
	type: DataSourceColumnType
	nullable: boolean
	required: boolean
	primary_key: boolean
	unique_key: boolean
	foreign_key: boolean
	auto_increment?: boolean
	default?: any
	extra?: any | ColumnExtraNumber | ColumnExtraString
	enums?: string[]
}

export interface DataSourceSchemaRelation {
	table: string
	column: string
	org_table: string
	org_column: string
}

export interface DataSourceCreateOneOptions {
	schema: DataSourceSchema
	data: object
}

export interface DataSourceRelations {
	table: string
	join: DataSourceSchemaRelation
	columns?: string[]
	where?: DataSourceWhere
	schema: DataSourceSchema
}

export interface DataSourceFindOneOptions extends DataSourceFindOptions {}

export interface DataSourceFindManyOptions extends DataSourceFindOptions {
	limit?: number
	offset?: number
	sort?: SortCondition[]
}

export interface DataSourceFindOptions {
	schema: DataSourceSchema
	fields?: string[]
	where?: DataSourceWhere[]
	relations?: DataSourceRelations[]
}

export interface DataSourceUpdateOneOptions {
	id: string
	schema: DataSourceSchema
	data: object
}

export interface DataSourceDeleteOneOptions {
	id: string
	schema: DataSourceSchema
	softDelete?: string // Soft delete column
}

export interface DataSourceFindTotalRecords {
	schema: DataSourceSchema
	where?: DataSourceWhere[]
}

export interface DataSourceConfig {
	type: DataSourceType
	host: string
	poolSize: number
	poolIdleTimeout?: number
	defaults: {
		limit: number
		relations: {
			limit: number
		}
	}
	deletes: {
		soft: string | undefined
	}
}

export interface DataSourceUniqueCheckOptions {
	schema: DataSourceSchema
	data: {
		[key: string]: string | number | boolean
	}
	id?: string
	x_request_id?: string
}

export interface DataSourceListTablesOptions {
	include_system?: boolean // tables like _llana_*
	include_known_db_orchestration?: boolean // like atlas_schema_revisions
}

export enum DatabaseErrorType {
	DUPLICATE_RECORD = 'DUPLICATE_RECORD',
	UNIQUE_KEY_VIOLATION = 'UNIQUE_KEY_VIOLATION',
	FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
	NOT_NULL_VIOLATION = 'NOT_NULL_VIOLATION',
	CHECK_CONSTRAINT_VIOLATION = 'CHECK_CONSTRAINT_VIOLATION',
	UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface DataSourceInterface {
	createTable(schema: DataSourceSchema): Promise<void>
	findOne(options: DataSourceFindOneOptions): Promise<any>
	findMany(options: DataSourceFindManyOptions): Promise<any[]>
	createOne(options: DataSourceCreateOneOptions): Promise<any>
	updateOne(options: DataSourceUpdateOneOptions): Promise<any>
	deleteOne(options: DataSourceDeleteOneOptions): Promise<void>
	uniqueCheck(options: DataSourceUniqueCheckOptions): Promise<boolean>
	truncate(schema: DataSourceSchema): Promise<void>
	checkConnection(): Promise<boolean>
	listTables(): Promise<string[]>
}
