export enum OracleColumnType {
	NUMBER = 'NUMBER',
	INTEGER = 'INTEGER',
	FLOAT = 'FLOAT',
	DOUBLE = 'DOUBLE',
	DECIMAL = 'DECIMAL',
	VARCHAR2 = 'VARCHAR2',
	NVARCHAR2 = 'NVARCHAR2',
	CHAR = 'CHAR',
	NCHAR = 'NCHAR',
	CLOB = 'CLOB',
	NCLOB = 'NCLOB',
	DATE = 'DATE',
	TIMESTAMP = 'TIMESTAMP',
	BOOLEAN = 'NUMBER(1)', // Oracle doesn't have native boolean
	BLOB = 'BLOB',
	RAW = 'RAW',
	LONG = 'LONG',
	LONG_RAW = 'LONG RAW',
	JSON = 'JSON', // Oracle 21c+ supports native JSON type
}
