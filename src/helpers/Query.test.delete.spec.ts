import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { UserTestingService } from '../testing/user.testing.service'
import { DatabaseSchema, QueryPerform, WhereOperator } from '../types/database.types'
import { DeleteResponseObject, FindOneResponseObject } from '../dtos/response.dto'
import { Logger, logLevel } from './Logger'
import { Query } from './Query'
import { Schema } from './Schema'

describe('Query > Delete', () => {
	let app: INestApplication
	let service: Query
	let schema: Schema
	let logger: Logger
	let usersTableSchema: DatabaseSchema
	let userTestingService: UserTestingService
	let primary_key: string

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
			providers: [UserTestingService],
			exports: [UserTestingService],
		}).compile()

		app = moduleRef.createNestApplication({
			logger: logLevel(),
		})

		service = app.get<Query>(Query)
		schema = app.get<Schema>(Schema)
		logger = app.get<Logger>(Logger)

		usersTableSchema = await schema.getSchema({ table: 'User' })
		userTestingService = app.get<UserTestingService>(UserTestingService)
		primary_key = usersTableSchema.primary_key
	})

	describe('Hard Deletes', () => {
		it('Hard', async () => {
			try {
				const user = await userTestingService.createUser({})

				const results = (await service.perform(QueryPerform.DELETE, {
					id: user[usersTableSchema.primary_key],
					schema: usersTableSchema,
				})) as DeleteResponseObject
				expect(results.deleted).toEqual(1)

				const deleted_record = (await service.perform(QueryPerform.FIND_ONE, {
					schema: usersTableSchema,
					where: [
						{
							column: primary_key,
							operator: WhereOperator.equals,
							value: user[usersTableSchema.primary_key],
						},
					],
				})) as FindOneResponseObject

				expect(deleted_record).toBe(null)
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})
	})

	describe('Soft Deletes', () => {
		it('Soft', async () => {
			try {
				const user = await userTestingService.createUser({})

				const results = (await service.perform(QueryPerform.DELETE, {
					id: user[usersTableSchema.primary_key],
					schema: usersTableSchema,
					softDelete: 'deletedAt',
				})) as DeleteResponseObject
				expect(results.deleted).toEqual(1)

				const deleted_record = (await service.perform(QueryPerform.FIND_ONE, {
					schema: usersTableSchema,
					where: [
						{
							column: primary_key,
							operator: WhereOperator.equals,
							value: user[usersTableSchema.primary_key],
						},
					],
				})) as FindOneResponseObject
				expect(deleted_record).toBeDefined()
			} catch (e) {
				logger.error(e)
				expect(true).toBe(false)
			}
		})
	})

	afterAll(async () => {
		await app.close()
	})
})
