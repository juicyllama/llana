import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { ConfigService } from '@nestjs/config'
import { Pagination } from './Pagination'
import { Logger } from './Logger'
import auth from '../config/auth.config'
import database from '../config/database.config'
import hosts from '../config/hosts.config'

describe('Pagination', () => {
	let app: TestingModule
	let service: Pagination
	let configService: ConfigService

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					load: [auth, database, hosts],
				}),
			],
			providers: [Pagination, Logger],
			exports: [Pagination, Logger],
		}).compile()

		service = app.get<Pagination>(Pagination)
		configService = app.get<ConfigService>(ConfigService)
	})

	describe('get', () => {
		it('No params passed', () => {
			const query = {}
			const result = service.get(query)
			expect(result.limit).toBe(Number(configService.get<string>('database.defaults.relations.limit')))
			expect(result.offset).toBe(0)
		})

		it('Limit passed', () => {
			const query = {
				limit: 10,
			}
			const result = service.get(query)
			expect(result.limit).toBe(10)
			expect(result.offset).toBe(0)
		})

		it('Offset passed', () => {
			const query = {
				offset: 10,
			}
			const result = service.get(query)
			expect(result.limit).toBe(Number(configService.get<string>('database.defaults.relations.limit')))
			expect(result.offset).toBe(10)
		})

		it('Page passed', () => {
			const query = {
				page: service.encodePage({ limit: 100, offset: 50 }),
			}
			const result = service.get(query)
			expect(result.limit).toBe(100)
			expect(result.offset).toBe(50)
		})

		it('Other value passed', () => {
			const query = {
				foo: 'bar',
			}
			const result = service.get(query)
			expect(result.limit).toBe(Number(configService.get<string>('database.defaults.relations.limit')))
			expect(result.offset).toBe(0)
		})
	})

	afterAll(async () => {
		await app.close()
	})
})
