import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'

import { Cassandra } from './cassandra.datasource'
import { Logger } from '../helpers/Logger'
import { Pagination } from '../helpers/Pagination'
import { DataSourceColumnType, WhereOperator } from '../types/datasource.types'

/**
 * Test for Cassandra datasource implementation
 * These tests verify the basic functionality of the Cassandra datasource
 */
describe('Cassandra Datasource', () => {
	let cassandra: Cassandra
	let configService: ConfigService
	let logger: Logger
	let pagination: Pagination

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				Cassandra,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string) => {
							switch (key) {
								case 'database.host':
									return 'cassandra://localhost:9042/llana?datacenter=datacenter1'
								default:
									return undefined
							}
						}),
					},
				},
				{
					provide: Logger,
					useValue: {
						log: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
						debug: jest.fn(),
						verbose: jest.fn(),
					},
				},
				{
					provide: Pagination,
					useValue: {},
				},
			],
		}).compile()

		cassandra = module.get<Cassandra>(Cassandra)
		configService = module.get<ConfigService>(ConfigService)
		logger = module.get<Logger>(Logger)
		pagination = module.get<Pagination>(Pagination)
	})

	describe('parseConnectionString', () => {
		it('should parse a basic Cassandra connection string', () => {
			const uri = 'cassandra://localhost:9042/llana?datacenter=datacenter1'
			const config = (cassandra as any).parseConnectionString(uri)

			expect(config).toEqual({
				contactPoints: ['localhost:9042'],
				localDataCenter: 'datacenter1',
				keyspace: 'llana',
				username: undefined,
				password: undefined,
				port: 9042,
			})
		})

		it('should parse a connection string with authentication', () => {
			const uri = 'cassandra://user:pass@localhost:9042/llana?datacenter=dc1'
			const config = (cassandra as any).parseConnectionString(uri)

			expect(config).toEqual({
				contactPoints: ['localhost:9042'],
				localDataCenter: 'dc1',
				keyspace: 'llana',
				username: 'user',
				password: 'pass',
				port: 9042,
			})
		})

		it('should parse a connection string with multiple contact points', () => {
			const uri = 'cassandra://host1,host2,host3:9042/llana?datacenter=datacenter1'
			const config = (cassandra as any).parseConnectionString(uri)

			expect(config).toEqual({
				contactPoints: ['host1:9042', 'host2:9042', 'host3:9042'],
				localDataCenter: 'datacenter1',
				keyspace: 'llana',
				username: undefined,
				password: undefined,
				port: 9042,
			})
		})

		it('should handle hosts with individual ports', () => {
			const uri = 'cassandra://host1:9043,host2:9044,host3/llana?datacenter=datacenter1'
			const config = (cassandra as any).parseConnectionString(uri)

			expect(config.contactPoints).toEqual(['host1:9043', 'host2:9044', 'host3:9043'])
			expect(config.localDataCenter).toBe('datacenter1')
			expect(config.keyspace).toBe('llana')
		})

		it('should use default values when not specified', () => {
			const uri = 'cassandra://localhost/llana'
			const config = (cassandra as any).parseConnectionString(uri)

			expect(config).toEqual({
				contactPoints: ['localhost:9042'],
				localDataCenter: 'datacenter1',
				keyspace: 'llana',
				username: undefined,
				password: undefined,
				port: 9042,
			})
		})
	})

	describe('mapCassandraTypeToDataSourceType', () => {
		it('should map text types to STRING', () => {
			expect((cassandra as any).mapCassandraTypeToDataSourceType('text')).toBe(DataSourceColumnType.STRING)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('varchar')).toBe(DataSourceColumnType.STRING)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('ascii')).toBe(DataSourceColumnType.STRING)
		})

		it('should map numeric types to NUMBER', () => {
			expect((cassandra as any).mapCassandraTypeToDataSourceType('int')).toBe(DataSourceColumnType.NUMBER)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('bigint')).toBe(DataSourceColumnType.NUMBER)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('float')).toBe(DataSourceColumnType.NUMBER)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('double')).toBe(DataSourceColumnType.NUMBER)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('decimal')).toBe(DataSourceColumnType.NUMBER)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('counter')).toBe(DataSourceColumnType.NUMBER)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('varint')).toBe(DataSourceColumnType.NUMBER)
		})

		it('should map boolean type to BOOLEAN', () => {
			expect((cassandra as any).mapCassandraTypeToDataSourceType('boolean')).toBe(DataSourceColumnType.BOOLEAN)
		})

		it('should map date/time types to DATE', () => {
			expect((cassandra as any).mapCassandraTypeToDataSourceType('timestamp')).toBe(DataSourceColumnType.DATE)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('date')).toBe(DataSourceColumnType.DATE)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('time')).toBe(DataSourceColumnType.DATE)
		})

		it('should map collection types to JSON', () => {
			expect((cassandra as any).mapCassandraTypeToDataSourceType('list<text>')).toBe(DataSourceColumnType.JSON)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('set<int>')).toBe(DataSourceColumnType.JSON)
			expect((cassandra as any).mapCassandraTypeToDataSourceType('map<text,int>')).toBe(DataSourceColumnType.JSON)
		})

		it('should map unknown types to UNKNOWN', () => {
			expect((cassandra as any).mapCassandraTypeToDataSourceType('custom_type')).toBe(DataSourceColumnType.UNKNOWN)
		})
	})

	describe('getDatabaseErrorType', () => {
		it('should identify duplicate entry errors', () => {
			const error = { message: 'already exists' }
			const errorType = cassandra.getDatabaseErrorType(error)
			expect(errorType).toBe('DUPLICATE_RECORD')
		})

		it('should identify unique constraint errors', () => {
			const error = { message: 'unique constraint violation' }
			const errorType = cassandra.getDatabaseErrorType(error)
			expect(errorType).toBe('UNIQUE_KEY_VIOLATION')
		})

		it('should identify not null errors', () => {
			const error = { message: 'not null violation' }
			const errorType = cassandra.getDatabaseErrorType(error)
			expect(errorType).toBe('NOT_NULL_VIOLATION')
		})

		it('should return UNKNOWN_ERROR for unrecognized errors', () => {
			const error = { message: 'some other error' }
			const errorType = cassandra.getDatabaseErrorType(error)
			expect(errorType).toBe('UNKNOWN_ERROR')
		})
	})

	describe('createTable', () => {
		it('should generate correct CQL for basic table creation', () => {
			const mockSchema = {
				table: 'TestTable',
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						primary_key: true,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
						auto_increment: true,
					},
					{
						field: 'name',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'email',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: false,
						required: true,
						unique_key: true,
						foreign_key: false,
					},
				],
				relations: [],
			}

			// Mock the performQuery method to capture the CQL
			let capturedCqls: string[] = []
			jest.spyOn(cassandra as any, 'performQuery').mockImplementation(async ({ cql }) => {
				capturedCqls.push(cql)
				return []
			})

			// Mock listTables to return empty array (table doesn't exist)
			jest.spyOn(cassandra, 'listTables').mockResolvedValue([])

			return cassandra.createTable(mockSchema, 'test').then(() => {
				const tableCql = capturedCqls[0] // First CQL should be table creation
				expect(tableCql).toContain('CREATE TABLE IF NOT EXISTS TestTable')
				expect(tableCql).toContain('id INT')
				expect(tableCql).toContain('name TEXT')
				expect(tableCql).toContain('email TEXT')
				expect(tableCql).toContain('PRIMARY KEY (id)')

				// Check that secondary index was created for email (unique_key: true)
				expect(capturedCqls.length).toBe(2)
				expect(capturedCqls[1]).toContain('CREATE INDEX IF NOT EXISTS TestTable_email_idx ON TestTable (email)')
			})
		})

		it('should handle different data types correctly', () => {
			const mockSchema = {
				table: 'TypeTestTable',
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						primary_key: true,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
						auto_increment: true,
					},
					{
						field: 'name',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'active',
						type: DataSourceColumnType.BOOLEAN,
						primary_key: false,
						nullable: true,
						required: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'created_at',
						type: DataSourceColumnType.DATE,
						primary_key: false,
						nullable: true,
						required: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'metadata',
						type: DataSourceColumnType.JSON,
						primary_key: false,
						nullable: true,
						required: false,
						unique_key: false,
						foreign_key: false,
					},
				],
				relations: [],
			}

			let capturedCqls: string[] = []
			jest.spyOn(cassandra as any, 'performQuery').mockImplementation(async ({ cql }) => {
				capturedCqls.push(cql)
				return []
			})
			jest.spyOn(cassandra, 'listTables').mockResolvedValue([])

			return cassandra.createTable(mockSchema, 'test').then(() => {
				const tableCql = capturedCqls[0]
				expect(tableCql).toContain('id INT')
				expect(tableCql).toContain('name TEXT')
				expect(tableCql).toContain('active BOOLEAN')
				expect(tableCql).toContain('created_at TIMESTAMP')
				expect(tableCql).toContain('metadata TEXT')
			})
		})

		it('should skip table creation if table already exists', async () => {
			const mockSchema = {
				table: 'ExistingTable',
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						primary_key: true,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
						auto_increment: true,
					},
				],
				relations: [],
			}

			// Mock listTables to return the table as existing
			jest.spyOn(cassandra, 'listTables').mockResolvedValue(['ExistingTable'])
			const performQuerySpy = jest.spyOn(cassandra as any, 'performQuery')

			const result = await cassandra.createTable(mockSchema, 'test')

			expect(result).toBe(true)
			expect(performQuerySpy).not.toHaveBeenCalled()
		})

		it('should handle errors gracefully', async () => {
			const mockSchema = {
				table: 'ErrorTable',
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						primary_key: true,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
						auto_increment: true,
					},
				],
				relations: [],
			}

			jest.spyOn(cassandra, 'listTables').mockResolvedValue([])
			jest.spyOn(cassandra as any, 'performQuery').mockRejectedValue(new Error('Database error'))

			const result = await cassandra.createTable(mockSchema, 'test')

			expect(result).toBe(false)
		})
	})

	describe('mapDataSourceTypeToCassandraType', () => {
		it('should map STRING to TEXT', () => {
			const column = { type: DataSourceColumnType.STRING, primary_key: false, auto_increment: false }
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('TEXT')
		})

		it('should map NUMBER with primary_key to INT by default', () => {
			const column = { type: DataSourceColumnType.NUMBER, primary_key: true, auto_increment: false }
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('INT')
		})

		it('should map NUMBER with auto_increment to INT by default', () => {
			const column = { type: DataSourceColumnType.NUMBER, primary_key: false, auto_increment: true }
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('INT')
		})

		it('should map NUMBER with explicit UUID type to UUID', () => {
			const column = {
				type: DataSourceColumnType.NUMBER,
				primary_key: true,
				auto_increment: false,
				extra: { cassandra_type: 'uuid' }
			}
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('UUID')
		})

		it('should map NUMBER with decimal to DECIMAL', () => {
			const column = {
				type: DataSourceColumnType.NUMBER,
				primary_key: false,
				auto_increment: false,
				extra: { decimal: 2 }
			}
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('DECIMAL')
		})

		it('should map regular NUMBER to INT', () => {
			const column = { type: DataSourceColumnType.NUMBER, primary_key: false, auto_increment: false }
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('INT')
		})

		it('should map BOOLEAN to BOOLEAN', () => {
			const column = { type: DataSourceColumnType.BOOLEAN, primary_key: false, auto_increment: false }
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('BOOLEAN')
		})

		it('should map DATE to TIMESTAMP', () => {
			const column = { type: DataSourceColumnType.DATE, primary_key: false, auto_increment: false }
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('TIMESTAMP')
		})

		it('should map JSON to TEXT', () => {
			const column = { type: DataSourceColumnType.JSON, primary_key: false, auto_increment: false }
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('TEXT')
		})

		it('should map ENUM to TEXT', () => {
			const column = { type: DataSourceColumnType.ENUM, primary_key: false, auto_increment: false }
			const result = (cassandra as any).mapDataSourceTypeToCassandraType(column)
			expect(result).toBe('TEXT')
		})
	})

	describe('Integration Tests', () => {
		// Note: These tests would require a running Cassandra instance
		// They are skipped by default but can be enabled for integration testing

		it.skip('should connect to Cassandra', async () => {
			const isConnected = await cassandra.checkConnection({ x_request_id: 'test' })
			expect(isConnected).toBe(true)
		})

		it.skip('should list tables', async () => {
			const tables = await cassandra.listTables({ x_request_id: 'test' })
			expect(Array.isArray(tables)).toBe(true)
		})

		it.skip('should get schema for a table', async () => {
			const schema = await cassandra.getSchema({ table: 'User', x_request_id: 'test' })
			expect(schema).toBeDefined()
			expect(schema.table).toBe('User')
			expect(Array.isArray(schema.columns)).toBe(true)
		})

		it.skip('should create table successfully', async () => {
			const testSchema = {
				table: 'TestCreateTable',
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						primary_key: true,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
						auto_increment: true,
					},
					{
						field: 'name',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'email',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: false,
						required: true,
						unique_key: true,
						foreign_key: false,
					},
				],
				relations: [],
			}

			const result = await cassandra.createTable(testSchema, 'test')
			expect(result).toBe(true)

			// Verify table was created
			const tables = await cassandra.listTables({ x_request_id: 'test' })
			expect(tables).toContain('TestCreateTable')

			// Verify schema
			const schema = await cassandra.getSchema({ table: 'TestCreateTable', x_request_id: 'test' })
			expect(schema.table).toBe('TestCreateTable')
			expect(schema.columns.length).toBeGreaterThan(0)
		})

		it.skip('should create system tables successfully', async () => {
			// Test creating a User table similar to what Llana creates
			const userSchema = {
				table: 'TestUser',
				primary_key: 'id',
				columns: [
					{
						field: 'id',
						type: DataSourceColumnType.NUMBER,
						primary_key: true,
						nullable: false,
						required: true,
						unique_key: true,
						foreign_key: false,
						auto_increment: true,
					},
					{
						field: 'email',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: false,
						required: true,
						unique_key: true,
						foreign_key: false,
					},
					{
						field: 'password',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'role',
						type: DataSourceColumnType.ENUM,
						primary_key: false,
						nullable: false,
						required: true,
						unique_key: false,
						foreign_key: false,
						enums: ['ADMIN', 'USER'],
					},
					{
						field: 'firstName',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: true,
						required: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'lastName',
						type: DataSourceColumnType.STRING,
						primary_key: false,
						nullable: true,
						required: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'createdAt',
						type: DataSourceColumnType.DATE,
						primary_key: false,
						nullable: true,
						required: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'updatedAt',
						type: DataSourceColumnType.DATE,
						primary_key: false,
						nullable: true,
						required: false,
						unique_key: false,
						foreign_key: false,
					},
					{
						field: 'deletedAt',
						type: DataSourceColumnType.DATE,
						primary_key: false,
						nullable: true,
						required: false,
						unique_key: false,
						foreign_key: false,
					},
				],
				relations: [],
			}

			const result = await cassandra.createTable(userSchema, 'test')
			expect(result).toBe(true)

			// Verify table was created
			const tables = await cassandra.listTables({ x_request_id: 'test' })
			expect(tables).toContain('TestUser')
		})

		it.skip('should perform CRUD operations', async () => {
			const mockSchema = {
				table: 'User',
				primary_key: 'id',
				columns: [],
				relations: [],
			}

			const testData = {
				id: require('crypto').randomUUID(),
				email: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
			}

			// Create
			const createResult = await cassandra.createOne({
				schema: mockSchema,
				data: testData,
			}, 'test')
			expect(createResult.data).toMatchObject(testData)

			// Read
			const findResult = await cassandra.findOne({
				schema: mockSchema,
				where: [{ column: 'id', operator: WhereOperator.equals, value: testData.id }],
			}, 'test')
			expect(findResult.data).toMatchObject(testData)

			// Update
			const updateData = { firstName: 'Updated' }
			const updateResult = await cassandra.updateOne({
				id: testData.id,
				schema: mockSchema,
				data: updateData,
			}, 'test')
			expect(updateResult.data.firstName).toBe('Updated')

			// Delete
			const deleteResult = await cassandra.deleteOne({
				id: testData.id,
				schema: mockSchema,
			}, 'test')
			expect(deleteResult.deleted).toBe(1)
		})
	})
})
