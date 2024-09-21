import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { isUndefined } from 'lodash'
import { OpenAPIV3_1 } from 'openapi-types'

import { version } from '../../package.json'
import { APP_BOOT_CONTEXT } from '../app.constants'
import { ListTablesResponseObject } from '../dtos/response.dto'
import { AuthLocation } from '../types/auth.types'
import { DatabaseColumnType, DatabaseSchema, QueryPerform } from '../types/database.types'
import { Authentication } from './Authentication'
import { Logger } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

@Injectable()
export class Documentation {
	constructor(
		private readonly authentication: Authentication,
		private readonly logger: Logger,
		private readonly configService: ConfigService,
		private readonly query: Query,
		private readonly schema: Schema,
	) {}

	/**
	 * Helper to check if we are skipping authentication
	 */

	skipDocs(): boolean {
		const skip_docs = this.configService.get<boolean | undefined>('SKIP_DOCS')

		if (!skip_docs || isUndefined(skip_docs)) {
			return false
		}

		return true
	}

	/**
	 * Generate documentation for the application
	 */

	async generateDocumentation(): Promise<OpenAPIV3_1.Document> {
		this.logger.log('Generating documentation')

		const apiDoc: OpenAPIV3_1.Document = {
			openapi: '3.1.0',
			info: {
				title: 'Api Documentation',
				version,
			},
			paths: {
				'/auth/login': {
					post: <any>this.getAuthLoginPath(),
				},
			},
			components: {
				schemas: {},
				securitySchemes: {
					bearerAuth: this.getSecurityDefinitions('http'),
					apiKeyAuth: this.getSecurityDefinitions('apiKey'),
				},
			},
			tags: [
				{
					name: 'Authentication',
					description: 'Endpoints for user authentication',
				},
			],
		}

		apiDoc.components.schemas['AuthenticationTokenResponse'] = this.getAuthLoginComponent()

		const { tables } = (await this.query.perform(
			QueryPerform.LIST_TABLES,
			undefined,
			APP_BOOT_CONTEXT,
		)) as ListTablesResponseObject
		for (const table of tables) {
			const schema = await this.schema.getSchema({ table, x_request_id: APP_BOOT_CONTEXT })

			if (schema.table === this.authentication.getIdentityTable()) {
				apiDoc.paths['/auth/profile'] = {
					get: <any>{
						description: 'Returns the user profile',
						summary: 'Get Profile',
						tags: ['Authentication'],
						security: [
							{
								bearerAuth: [],
							},
						],
						responses: {
							200: this.get200Response(this.convertSchemaToOpenAPIExample(schema), 'UserProfileResponse'),
							401: this.get401Response(),
						},
					},
				}

				apiDoc.components.schemas['UserProfileResponse'] = this.convertSchemaToOpenAPISchema(schema)
			}

			apiDoc.paths[`/${table}/`] = {
				post: <any>{
					description: `Creates a new ${table}`,
					summary: `Create ${table}`,
					tags: [table],
					security: [
						{
							bearerAuth: [],
							apiKeyAuth: [],
						},
					],
					requestBody: this.getRequestBody(
						this.convertSchemaToOpenAPIBodyRequest(schema),
						this.convertSchemaRequiredToOpenAPI(schema),
					),
					responses: {
						201: this.get200Response(this.convertSchemaToOpenAPIExample(schema), table + 'Response'),
						400: this.get400Response(),
						401: this.get401Response(),
					},
				},
				get: <any>{
					description: `Returns a list of ${table} records`,
					summary: `List ${table}`,
					tags: [table],
					requestBody: this.getListRequestBody(schema),
					security: [
						{
							bearerAuth: [],
							apiKeyAuth: [],
						},
					],
					responses: {
						200: this.get200Response(
							{
								limit: 20,
								offset: 0,
								total: 70,
								pagination: {
									total: 20,
									page: {
										current: 'eyJsaW1pdCI6MjAsIm9mZnNldCI6MH0=',
										prev: null,
										next: 'eyJsaW1pdCI6MjAsIm9mZnNldCI6MjB9',
										first: 'eyJsaW1pdCI6MjAsIm9mZnNldCI6MH0=',
										last: 'eyJsaW1pdCI6MjAsIm9mZnNldCI6NTB9',
									},
								},
								data: [this.convertSchemaToOpenAPIExample(schema)],
							},
							'List' + table + 'Response',
						),
						400: this.get400Response(),
						401: this.get401Response(),
					},
				},
			}

			const response_schema = schema
			delete response_schema._x_request_id

			apiDoc.paths[`/${table}/:id`] = {
				get: <any>{
					description: `Returns a record of ${table}`,
					summary: `Get ${table}`,
					tags: [table],
					requestBody: this.getSingleRequestBody(schema),
					security: [
						{
							bearerAuth: [],
							apiKeyAuth: [],
						},
					],
					responses: {
						200: this.get200Response(this.convertSchemaToOpenAPIExample(schema), table + 'Response'),
						400: this.get400Response(),
						401: this.get401Response(),
					},
				},
				put: <any>{
					description: `Updates a ${table} record`,
					summary: `Update ${table}`,
					tags: [table],
					security: [
						{
							bearerAuth: [],
							apiKeyAuth: [],
						},
					],
					requestBody: this.getRequestBody(this.convertSchemaToOpenAPIBodyRequest(schema), []),
					responses: {
						201: this.get200Response(this.convertSchemaToOpenAPIExample(schema), table + 'Response'),
						400: this.get400Response(),
						401: this.get401Response(),
					},
				},
				delete: <any>{
					description: `Deletes a record of ${table}`,
					summary: `Delete ${table}`,
					tags: [table],
					security: [
						{
							bearerAuth: [],
							apiKeyAuth: [],
						},
					],
					responses: {
						200: this.get200Response(
							{
								deleted: 1,
							},
							table + 'DeleteResponse',
						),
						400: this.get400Response(),
						401: this.get401Response(),
					},
				},
			}

			apiDoc.paths[`/${table}/schema`] = {
				get: <any>{
					description: `Returns the table schema for ${table}`,
					summary: `Schema`,
					tags: [table],
					security: [
						{
							bearerAuth: [],
							apiKeyAuth: [],
						},
					],
					responses: {
						200: this.get200Response(response_schema, 'SchemaResponse'),
						401: this.get401Response(),
					},
				},
			}
		}
		return apiDoc
	}

	getAuthLoginPath(): OpenAPIV3_1.OperationObject {
		return {
			description:
				'Takes a `username` and `password` and returns an `access_token` if successfully authenticated',
			summary: 'Login',
			tags: ['Authentication'],
			requestBody: this.getRequestBody({ username: 'string', password: 'string' }, ['username', 'password']),
			responses: {
				200: this.get200Response(
					{
						access_token: 'eyJ0...CiM',
						id: '1',
					},
					'AuthenticationTokenResponse',
				),
				400: this.get400Response(),
				401: this.get401Response(),
			},
		}
	}

	getAuthLoginComponent(): OpenAPIV3_1.SchemaObject {
		return {
			type: 'object',
			properties: {
				access_token: {
					type: 'string',
				},
				id: {
					type: 'string',
				},
			},
		}
	}

	getRequestBody(properties: object, required: string[], bodyRequired = true): OpenAPIV3_1.RequestBodyObject {
		const openapiProperties = Object.keys(properties).reduce((acc, property) => {
			acc[property] = {
				type: properties[property],
			}
			return acc
		}, {})

		return {
			content: {
				'application/json': {
					schema: {
						type: 'object',
						properties: openapiProperties,
						required,
					},
				},
			},
			required: bodyRequired,
		}
	}

	get200Response(example: object, schemaName: string): OpenAPIV3_1.ResponseObject {
		return {
			content: {
				'application/json': {
					examples: {
						response: {
							value: example,
						},
					},
					schema: {
						$ref: '#/components/schemas/' + schemaName,
					},
				},
			},
			description: 'Success',
		}
	}

	get400Response(): OpenAPIV3_1.ResponseObject {
		return {
			description: 'Invalid Request',
		}
	}

	get401Response(): OpenAPIV3_1.ResponseObject {
		return {
			description: 'Unauthorized',
		}
	}

	/**
	 * Convert Llana schema to OpenAPI schema
	 */

	convertSchemaToOpenAPIBodyRequest(schema: DatabaseSchema): object {
		let columns = schema.columns

		columns = schema.columns.filter(column => column.field !== schema.primary_key)

		return columns.reduce((acc, column) => {
			acc[column.field] =
				column.type === DatabaseColumnType.ENUM
					? `One of: ${column.enums?.join(', ')}`
					: (column.default ?? column.type)
			return acc
		}, {})
	}

	/**
	 * Convert Llana schema to OpenAPI schema
	 */

	convertSchemaToOpenAPIExample(schema: DatabaseSchema): object {
		let columns = schema.columns

		return columns.reduce((acc, column) => {
			acc[column.field] = column.default ?? column.type
			return acc
		}, {})
	}

	/**
	 * Convert Llana schema required fields to OpenAPI schema
	 */

	convertSchemaRequiredToOpenAPI(schema: DatabaseSchema): string[] {
		return schema.columns.filter(column => column.required).map(column => column.field)
	}

	/**
	 * Convert Llana schema to OpenAPI schema
	 */

	convertSchemaToOpenAPISchema(schema: DatabaseSchema): OpenAPIV3_1.SchemaObject {
		const openapiSchema = schema.columns.reduce((acc, column) => {
			acc[column.field] = {
				type: column.type,
			}
			return acc
		}, {})

		return {
			type: 'object',
			properties: openapiSchema,
		}
	}

	/**
	 * Get security definitions
	 */

	getSecurityDefinitions(type): OpenAPIV3_1.SecuritySchemeObject {
		if (type.includes('http')) {
			return {
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
			}
		}

		if (type.includes('apiKey')) {
			return {
				name: process.env.AUTH_USER_API_KEY_NAME ?? 'x-api-key',
				type: 'apiKey',
				in: (process.env.AUTH_USER_API_KEY_LOCATION ?? AuthLocation.HEADER).toLowerCase(),
			}
		}
	}

	getListRequestBody(schema: DatabaseSchema): OpenAPIV3_1.RequestBodyObject {
		const properties = {}

		for (const column of schema.columns) {
			let operators = ''

			switch (column.type) {
				case DatabaseColumnType.BOOLEAN:
					operators = `\`${column.field}=true\`, \`${column.field}=false\`, \`${column.field}[null]\`, \`${column.field}[not_null]\`, \`${column.field}[equals]=true\`, \`${column.field}[not_equals]=true\``
					break
				case DatabaseColumnType.DATE:
					operators = `\`${column.field}=2021-01-01\`, \`${column.field}[gt]=2021-01-01\`, \`${column.field}[lt]=2021-01-01\`, \`${column.field}[gte]=2021-01-01\`, \`${column.field}[lte]=2021-01-01\`, \`${column.field}[null]\`, \`${column.field}[not_null]\``
					break
				case DatabaseColumnType.STRING:
					operators = `\`${column.field}=value\`, \`${column.field}[search]=value\`, \`${column.field}[like]=value\`, \`${column.field}[not_like]=value\`, \`${column.field}[null]\`, \`${column.field}[not_null]\``
					break
				case DatabaseColumnType.NUMBER:
					operators = `\`${column.field}=1\`, \`${column.field}[gt]=1\`, \`${column.field}[lt]=1\`, \`${column.field}[gte]=1\`, \`${column.field}[lte]=1\`, \`${column.field}[null]\`, \`${column.field}[not_null]\``
					break
				case DatabaseColumnType.ENUM:
					operators = `\`${column.field}=value\`, \`${column.field}[null]\`, \`${column.field}[not_null].\``
					if (column.enums?.length) {
						operators += `Enums are: \`${column.enums?.join('`, `')}\`.`
					}
					break
			}

			properties[column.field] = {
				description: `Filter by ${column.field}, options are: ${operators}`,
				type: column.type,
			}
		}

		return {
			content: {
				'application/json': {
					schema: {
						type: 'object',
						properties: {
							fields: {
								description:
									'The fields to return, you can pass `table.field` to get a specific field in a related table. Default is all fields in the table.',
								type: 'array',
								items: {
									type: 'string',
								},
							},
							relations: {
								description: `One or more relations to include in the response. One of the following: \`${schema.relations.map(r => r.table).join('`, `')}\``,
								type: 'array',
								items: {
									type: 'string',
								},
							},
							page: {
								type: 'string',
								description: 'Used for pagination, pass the page result from a previous request',
							},
							limit: {
								type: 'number',
								description: 'The number of records to return',
							},
							offset: {
								type: 'number',
								description: 'The number of records to skip',
							},
							sort: {
								description:
									'The fields to sort by, expects a comma separated list of fields. Format is sort=`{column}.{direction},column.{direction}`',
								type: 'string',
							},
							...properties,
						},
					},
				},
			},
			required: false,
		}
	}

	getSingleRequestBody(schema: DatabaseSchema): OpenAPIV3_1.RequestBodyObject {
		return {
			content: {
				'application/json': {
					schema: {
						type: 'object',
						properties: {
							fields: {
								description:
									'The fields to return, you can pass `table.field` to get a specific field in a related table. Default is all fields in the table.',
								type: 'array',
								items: {
									type: 'string',
								},
							},
							relations: {
								description: `One or more relations to include in the response. One of the following: \`${schema.relations.map(r => r.table).join('`, `')}\``,
								type: 'array',
								items: {
									type: 'string',
								},
							},
						},
					},
				},
			},
			required: false,
		}
	}
}
