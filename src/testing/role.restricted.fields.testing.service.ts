import { Injectable } from '@nestjs/common'
import { assert } from 'chai'

import { FindOneResponseObject } from '../dtos/response.dto'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import {
	DataSourceColumnType,
	DataSourceSchema,
	DataSourceType,
	QueryPerform,
	WhereOperator,
} from '../types/datasource.types'
import { RolePermission } from '../types/roles.types'

@Injectable()
export class RoleRestrictedFieldsTestingService {
	private readonly TEST_TABLE = 'test_restricted_fields'
	private readonly TEST_MAIN_TABLE = 'test_main'
	private readonly TEST_RELATED_TABLE = 'test_related'
	private readonly TEST_EDGE_TABLE = 'test_restricted_fields_edge'
	private readonly LLANA_ROLES_TABLE = '_llana_roles'

	constructor(
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	async testRestrictedFields(): Promise<void> {
		// Test with different database types
		const databases = [
			{ type: DataSourceType.POSTGRES, name: 'PostgreSQL' },
			{ type: DataSourceType.MYSQL, name: 'MySQL' },
			{ type: DataSourceType.MSSQL, name: 'MSSQL' },
			{ type: DataSourceType.MONGODB, name: 'MongoDB' },
			{ type: DataSourceType.AIRTABLE, name: 'Airtable' },
		]

		for (const db of databases) {
			console.log(`Testing with ${db.name}...`)
			await this._testRestrictedFields()
		}
	}

	private async _testRestrictedFields(): Promise<void> {
		// Create test table schema with database-specific configuration
		const testSchema: DataSourceSchema = {
			table: this.TEST_TABLE,
			primary_key: 'id',
			columns: [
				{
					field: 'id',
					type: DataSourceColumnType.NUMBER,
					nullable: false,
					required: true,
					primary_key: true,
					unique_key: true,
					auto_increment: true,
					foreign_key: false,
				},
				{
					field: 'public_field',
					type: DataSourceColumnType.STRING,
					nullable: true,
					required: false,
					primary_key: false,
					unique_key: false,
					foreign_key: false,
				},
				{
					field: 'restricted_field',
					type: DataSourceColumnType.STRING,
					nullable: true,
					required: false,
					primary_key: false,
					unique_key: false,
					foreign_key: false,
				},
				{
					field: 'private_field',
					type: DataSourceColumnType.STRING,
					nullable: true,
					required: false,
					primary_key: false,
					unique_key: false,
					foreign_key: false,
				},
			],
		}

		// Create test table
		await this.query.perform(QueryPerform.CREATE_TABLE, { schema: testSchema })

		// Insert test record
		const record = (await this.query.perform(QueryPerform.CREATE, {
			schema: testSchema,
			data: {
				public_field: 'public value',
				restricted_field: 'restricted value',
				private_field: 'private value',
			},
		})) as FindOneResponseObject

		// Create role with restricted fields
		await this.query.perform(QueryPerform.CREATE, {
			schema: await this.schema.getSchema({ table: this.LLANA_ROLES_TABLE }),
			data: {
				custom: true,
				table: this.TEST_TABLE,
				role: 'RESTRICTED_USER',
				records: RolePermission.READ_RESTRICTED,
				restricted_fields: 'id,public_field,restricted_field',
			},
		})

		// Test restricted field access
		const result = (await this.query.perform(QueryPerform.FIND_ONE, {
			schema: testSchema,
			where: [{ column: 'id', operator: WhereOperator.equals, value: record.id }],
			restricted_fields: ['id', 'public_field', 'restricted_field'],
		})) as FindOneResponseObject

		// Verify only allowed fields are returned
		assert(result)
		assert.hasAllKeys(result, ['id', 'public_field', 'restricted_field', '_x_request_id'])
		assert.notProperty(result, 'private_field')
		assert.equal(result.public_field, 'public value')
		assert.equal(result.restricted_field, 'restricted value')

		// Clean up
		await this.query.perform(QueryPerform.TRUNCATE, { schema: testSchema })
	}

	async testRestrictedFieldsWithRelations(): Promise<void> {
		// Test with different database types
		const databases = [
			{ type: DataSourceType.POSTGRES, name: 'PostgreSQL' },
			{ type: DataSourceType.MYSQL, name: 'MySQL' },
			{ type: DataSourceType.MSSQL, name: 'MSSQL' },
			{ type: DataSourceType.MONGODB, name: 'MongoDB' },
			{ type: DataSourceType.AIRTABLE, name: 'Airtable' },
		]

		for (const db of databases) {
			console.log(`Testing with ${db.name}...`)
			try {
				await this._testRestrictedFieldsWithRelations()
			} catch (error) {
				console.error(`Test failed for ${db.name}:`, error)
				throw error
			}
		}
	}

	private async _testRestrictedFieldsWithRelations(): Promise<void> {
		// Create main table schema
		const mainSchema: DataSourceSchema = {
			table: this.TEST_MAIN_TABLE,
			primary_key: 'id',
			columns: [
				{
					field: 'id',
					type: DataSourceColumnType.NUMBER,
					nullable: false,
					required: true,
					primary_key: true,
					unique_key: true,
					auto_increment: true,
					foreign_key: false,
				},
				{
					field: 'public_field',
					type: DataSourceColumnType.STRING,
					nullable: true,
					required: false,
					primary_key: false,
					unique_key: false,
					foreign_key: false,
				},
				{
					field: 'private_field',
					type: DataSourceColumnType.STRING,
					nullable: true,
					required: false,
					primary_key: false,
					unique_key: false,
					foreign_key: false,
				},
			],
		}

		// Create related table schema
		const relatedSchema: DataSourceSchema = {
			table: this.TEST_RELATED_TABLE,
			primary_key: 'id',
			columns: [
				{
					field: 'id',
					type: DataSourceColumnType.NUMBER,
					nullable: false,
					required: true,
					primary_key: true,
					unique_key: true,
					auto_increment: true,
					foreign_key: false,
				},
				{
					field: 'main_id',
					type: DataSourceColumnType.NUMBER,
					nullable: false,
					required: true,
					primary_key: false,
					unique_key: false,
					foreign_key: true,
				},
				{
					field: 'public_data',
					type: DataSourceColumnType.STRING,
					nullable: true,
					required: false,
					primary_key: false,
					unique_key: false,
					foreign_key: false,
				},
				{
					field: 'private_data',
					type: DataSourceColumnType.STRING,
					nullable: true,
					required: false,
					primary_key: false,
					unique_key: false,
					foreign_key: false,
				},
			],
		}

		// Create tables
		await this.query.perform(QueryPerform.CREATE_TABLE, { schema: mainSchema })
		await this.query.perform(QueryPerform.CREATE_TABLE, { schema: relatedSchema })

		// Insert main record
		const mainRecord = (await this.query.perform(QueryPerform.CREATE, {
			schema: mainSchema,
			data: {
				public_field: 'public main',
				private_field: 'private main',
			},
		})) as FindOneResponseObject

		// Insert related record
		await this.query.perform(QueryPerform.CREATE, {
			schema: relatedSchema,
			data: {
				main_id: mainRecord.id,
				public_data: 'public related',
				private_data: 'private related',
			},
		})

		// Create role with restricted fields
		await this.query.perform(QueryPerform.CREATE, {
			schema: await this.schema.getSchema({ table: this.LLANA_ROLES_TABLE }),
			data: {
				custom: true,
				table: this.TEST_MAIN_TABLE,
				role: 'RESTRICTED_USER',
				records: RolePermission.READ_RESTRICTED,
				restricted_fields: 'id,public_field',
			},
		})

		await this.query.perform(QueryPerform.CREATE, {
			schema: await this.schema.getSchema({ table: this.LLANA_ROLES_TABLE }),
			data: {
				custom: true,
				table: this.TEST_RELATED_TABLE,
				role: 'RESTRICTED_USER',
				records: RolePermission.READ_RESTRICTED,
				restricted_fields: 'id,main_id,public_data',
			},
		})

		// Test restricted field access with relations
		const result = (await this.query.perform(QueryPerform.FIND_ONE, {
			schema: mainSchema,
			where: [{ column: 'id', operator: WhereOperator.equals, value: mainRecord.id }],
			restricted_fields: ['id', 'public_field'],
			relations: [
				{
					table: this.TEST_RELATED_TABLE,
					join: {
						table: this.TEST_RELATED_TABLE,
						column: 'main_id',
						org_table: this.TEST_MAIN_TABLE,
						org_column: 'id',
					},
					schema: relatedSchema,
				},
			],
		})) as FindOneResponseObject

		// Verify main record fields
		assert(result)
		assert.hasAllKeys(result, ['id', 'public_field', this.TEST_RELATED_TABLE, '_x_request_id'])
		assert.notProperty(result, 'private_field')
		assert.equal(result.public_field, 'public main')

		// Verify related record fields
		assert(Array.isArray(result[this.TEST_RELATED_TABLE]))
		assert(result[this.TEST_RELATED_TABLE].length === 1)
		const relatedResult = result[this.TEST_RELATED_TABLE][0]
		assert.hasAllKeys(relatedResult, ['id', 'main_id', 'public_data'])
		assert.notProperty(relatedResult, 'private_data')
		assert.equal(relatedResult.public_data, 'public related')

		// Clean up
		await this.query.perform(QueryPerform.TRUNCATE, { schema: mainSchema })
		await this.query.perform(QueryPerform.TRUNCATE, { schema: relatedSchema })
	}

	async testEdgeCases(): Promise<void> {
		// Create test table schema
		const testSchema: DataSourceSchema = {
			table: this.TEST_EDGE_TABLE,
			primary_key: 'id',
			columns: [
				{
					field: 'id',
					type: DataSourceColumnType.NUMBER,
					nullable: false,
					required: true,
					primary_key: true,
					unique_key: true,
					auto_increment: true,
					foreign_key: false,
				},
				{
					field: 'nullable_field',
					type: DataSourceColumnType.STRING,
					nullable: true,
					required: false,
					primary_key: false,
					unique_key: false,
					foreign_key: false,
				},
			],
		}

		// Create test table
		await this.query.perform(QueryPerform.CREATE_TABLE, { schema: testSchema })

		// Insert test record with null value
		const record = (await this.query.perform(QueryPerform.CREATE, {
			schema: testSchema,
			data: {
				nullable_field: null,
			},
		})) as FindOneResponseObject

		// Test with empty restricted fields list
		const resultEmpty = (await this.query.perform(QueryPerform.FIND_ONE, {
			schema: testSchema,
			where: [{ column: 'id', operator: WhereOperator.equals, value: record.id }],
			restricted_fields: [],
		})) as FindOneResponseObject

		// Verify all fields are returned when restricted_fields is empty
		assert(resultEmpty)
		assert.hasAllKeys(resultEmpty, ['id', 'nullable_field', '_x_request_id'])

		// Test with null values
		const resultWithNull = (await this.query.perform(QueryPerform.FIND_ONE, {
			schema: testSchema,
			where: [{ column: 'id', operator: WhereOperator.equals, value: record.id }],
			restricted_fields: ['id', 'nullable_field'],
		})) as FindOneResponseObject

		// Verify null values are handled correctly
		assert(resultWithNull)
		assert.hasAllKeys(resultWithNull, ['id', 'nullable_field', '_x_request_id'])
		assert.isNull(resultWithNull.nullable_field)

		// Clean up
		await this.query.perform(QueryPerform.TRUNCATE, { schema: testSchema })
	}
}
