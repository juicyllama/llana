import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from './app.module'

describe('App', () => {
	let app: INestApplication

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()
	})

	describe('Boots Up', () => {
		it('Serving 200', async function () {
			await request(app.getHttpServer()).get('/').expect(200)
		})
	})

	afterAll(async () => {
		await app.close()
	})
})
