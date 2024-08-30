import exp from "constants"
import { FindManyOptions } from "typeorm"

export enum DatabaseNaming {
    SNAKE_CASE = "SNAKE_CASE",
    //CAMEL_CASE = "CAMEL_CASE" TODO: support camel case
}

export enum WhereOperator {
    EQUALS = "=",
    NOT_EQUALS = "!=",
    LESS_THAN = "<",
    LESS_THAN_OR_EQUAL = "<=",
    GREATER_THAN = ">",
    GREATER_THAN_OR_EQUAL = ">=",
    LIKE = "LIKE",
    NOT_LIKE = "NOT LIKE",
    IN = "IN",
    NOT_IN = "NOT IN",
    IS_NULL = "IS NULL",
    IS_NOT_NULL = "IS NOT NULL"
}

export enum DatabaseColumnType {
    INT = 'int',
    SMALLINT = 'smallint',
    BIGINT = 'bigint',
    FLOAT = 'float',
    DOUBLE = 'double',
    DECIMAL = 'decimal',
    CHAR = 'char',
    VARCHAR = 'varchar',
    TEXT = 'text',
    BLOB = 'blob',
    BOOLEAN = 'boolean',
    DATE = 'date',
    TIME = 'time',
    DATETIME = 'datetime',
    TIMESTAMP = 'timestamp',
}

export enum ImportMode {
	CREATE = 'CREATE',
	UPSERT = 'UPSERT',
	DELETE = 'DELETE',
	REPOPULATE = 'REPOPULATE',
}

export declare enum ChartsPeriod {
    MIN = "MIN",
    '15MIN' = "15MIN",
    '30MIN' = "30MIN",
    HOUR = "HOUR",
    DAY = "DAY",
    WEEK = "WEEK",
    MONTH = "MONTH",
    YEAR = "YEAR"
}

export type ChartOptions<T = any> = FindManyOptions<any> & {
	search?: string
	period?: ChartsPeriod
	from?: Date
	to?: Date
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
    table: string,
    columns: DatabaseSchemaColumn[],
    relations: DatabaseSchemaRelation[]
}



export interface DatabaseSchemaColumn {
    field: string,
    type: DatabaseColumnType,
    nullable: boolean,
    required: boolean,
    primary_key: boolean,
    unique_key: boolean,
    foreign_key: boolean,
    default?: any,
    extra?: any
}

export interface DatabaseSchemaRelation {
    table: string,
    column: string,
    key: string
}

export interface DatabaseFindOneByIdOptions extends DatabaeseFindOptions {
    id: string,
}

export interface DatabaseFindOneOptions extends DatabaeseFindOptions {
    where: {
        column: string,
        operator: WhereOperator,
        value: string
    }[]
}

export interface DatabaseFindManyOptions extends DatabaeseFindOptions {
    where?: {
        column: string,
        operator: WhereOperator,
        value: string
    }[],
    limit?: number,
    offset?: number,
    order?: {
        column: string,
        direction: 'ASC' | 'DESC'
    }
}

export interface DatabaeseFindOptions {
    schema: DatabaseSchema,
    fields?: string,
    relations?: string,
}