import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest';
import { AppModule } from './app.module'

describe('App', () => {
	let app: INestApplication
	
	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.listen(3050)
		await app.init()
	})

	describe('Boots Up', () => {
		it('Llana Version Printed', async function () {

			const home = await request(app.getHttpServer())
			.get('/')
			.expect(200)

			expect(home.text).toBeDefined()
			expect(home.text.includes('🦙')).toBeTruthy()
		})


	})

	afterAll(async () => {
		await app.close()
	})
})
