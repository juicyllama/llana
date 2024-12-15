import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from './app.module'
import { TIMEOUT } from './testing/testing.const'
import { Logger } from './helpers/Logger'

describe('App > Controller > Get', () => {
	let app: INestApplication

	let jwt: string
	let logger = new Logger()
	const username = 'test@test.com'
	const password = 'test'
	const APIKey = 'Ex@mp1eS$Cu7eAp!K3y'

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()
	}, TIMEOUT)

	beforeEach(() => {
		logger.debug('===========================================')
		logger.log('🧪 ' + expect.getState().currentTestName)
		logger.debug('===========================================')
	})

	describe('JWT', () => {
		it('Login', async function () {
			const result = await request(app.getHttpServer())
				.post(`/auth/login`)
				.send({
					username,
					password,
				})
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.access_token).toBeDefined()
			jwt = result.body.access_token
		})

		it('Profile', async function () {
			const result = await request(app.getHttpServer())
				.get(`/auth/profile`)
				.set('Authorization', `Bearer ${jwt}`)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.email).toBeDefined()
			expect(result.body.email).toBe(username)
		})

	})

	describe('API Key', () => {
		it('Profile', async function () {
			const result = await request(app.getHttpServer())
				.get(`/auth/profile`)
				.set('x-api-key', APIKey)
				.expect(200)

			expect(result.body).toBeDefined()
			expect(result.body.email).toBeDefined()
			expect(result.body.email).toBe(username)
		})

	})

	afterAll(async () => {
		await app.close()
	}, TIMEOUT)
})
