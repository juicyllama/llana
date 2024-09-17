import { SortCondition } from './schema.types'

export enum DatabaseNaming {
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

export enum DatabaseColumnType {
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

export enum DatabaseJoinType {
	INNER = 'INNER JOIN',
	LEFT = 'LEFT JOIN',
	RIGHT = 'RIGHT JOIN',
}

export enum DatabaseJoinStage {
	WITH_QUERY = 'WITH_QUERY',
	POST_QUERY = 'POST_QUERY',
}

export interface ChartResult {
	count: number
	[key: string]: any
	time_interval: Date
}

export enum DatabaseType {
	ORACLE = 'oracle',
	MYSQL = 'mysql',
	MSSQL = 'mssql',
	POSTGRES = 'postgres',
	MONGODB = 'mongodb',
	REDIS = 'redis',
	SNOWFLAKE = 'snowflake',
	ELASTICSEARCH = 'elasticsearch',
	SQLITE = 'sqlite',
	CASSANDRA = 'cassandra',
	MARIADB = 'mariadb',
}

export interface DatabaseSchema {
	table: string
	primary_key: string
	columns: DatabaseSchemaColumn[]
	relations?: DatabaseSchemaRelation[]
	_x_request_id?: string
}

export interface DatabaseWhere {
	column: string
	operator: WhereOperator
	value?: string
}

export interface DatabaseSchemaColumn {
	field: string
	type: DatabaseColumnType
	nullable: boolean
	required: boolean
	primary_key: boolean
	unique_key: boolean
	foreign_key: boolean
	auto_increment?: boolean
	default?: any
	extra?: any
	enums?: string[]
}

export interface DatabaseSchemaRelation {
	table: string
	column: string
	org_table: string
	org_column: string
}

export interface DatabaseCreateOneOptions {
	schema: DatabaseSchema
	data: object
}

export interface DatabaseJoin extends DatabaseSchemaRelation {
	type?: DatabaseJoinType
}

export interface DatabaseRelations {
	table: string
	join: DatabaseJoin
	columns?: string[]
	where?: DatabaseWhere
	schema: DatabaseSchema
}

export interface DatabaseFindOneOptions extends DatabaeseFindOptions {}

export interface DatabaseFindManyOptions extends DatabaeseFindOptions {
	limit?: number
	offset?: number
	sort?: SortCondition[]
}

export interface DatabaeseFindOptions {
	schema: DatabaseSchema
	fields?: string[]
	where?: DatabaseWhere[]
	relations?: DatabaseRelations[]
}

export interface DatabaseUpdateOneOptions {
	id: string
	schema: DatabaseSchema
	data: object
}

export interface DatabaseDeleteOneOptions {
	id: string
	schema: DatabaseSchema
	softDelete?: string // Soft delete column
}

export interface DatabaseFindTotalRecords {
	schema: DatabaseSchema
	where?: DatabaseWhere[]
}

export interface DatabaseConfig {
	type: DatabaseType
	host: string
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

export interface DatabaseUniqueCheckOptions {
	schema: DatabaseSchema
	data: {
		[key: string]: string | number | boolean
	}
	id?: string
}
