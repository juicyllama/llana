import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'

import { AppModule } from '../app.module'
import { Pagination } from './Pagination'

describe('Pagination', () => {
	let app: INestApplication
	let service: Pagination
	let configService: ConfigService

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()

		service = app.get<Pagination>(Pagination)
		configService = app.get<ConfigService>(ConfigService)
	})

	describe('get', () => {
		it('No params passed', () => {
			const query = {}
			const result = service.get(query)
			expect(result.limit).toBe(Number(configService.get<string>('database.defaults.limit')))
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
			expect(result.limit).toBe(Number(configService.get<string>('database.defaults.limit')))
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
			expect(result.limit).toBe(Number(configService.get<string>('database.defaults.limit')))
			expect(result.offset).toBe(0)
		})
	})

	afterAll(async () => {
		await app.close()
	})
})
