export enum CassandraColumnType {
	ASCII = 'ascii',
	BIGINT = 'bigint',
	BLOB = 'blob',
	BOOLEAN = 'boolean',
	COUNTER = 'counter',
	DATE = 'date',
	DECIMAL = 'decimal',
	DOUBLE = 'double',
	DURATION = 'duration',
	FLOAT = 'float',
	INET = 'inet',
	INT = 'int',
	SMALLINT = 'smallint',
	TEXT = 'text',
	TIME = 'time',
	TIMESTAMP = 'timestamp',
	TIMEUUID = 'timeuuid',
	TINYINT = 'tinyint',
	UUID = 'uuid',
	VARCHAR = 'varchar',
	VARINT = 'varint',
	LIST = 'list',
	MAP = 'map',
	SET = 'set',
	TUPLE = 'tuple',
	UDT = 'udt', // User Defined Type
}

export interface CassandraConnectionConfig {
	contactPoints: string[]
	localDataCenter: string
	keyspace?: string
	username?: string
	password?: string
	port?: number
	ssl?: boolean
}
