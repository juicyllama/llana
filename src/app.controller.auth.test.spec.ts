import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService, ConfigFactory } from '@nestjs/config'
import * as request from 'supertest'
import { castArray } from 'lodash'

import { AppModule } from './app.module'
import { TIMEOUT } from './testing/testing.const'
import { Logger } from './helpers/Logger'

// Import configs
import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { envValidationSchema } from './config/env.validation'
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from './auth/auth.constants'

// Type the config imports
const configs: ConfigFactory[] = [auth, database, hosts, jwt, roles]

describe('App > Controller > Auth', () => {
	let app: INestApplication

	let access_token: string, refresh_token: string
	let logger = new Logger()

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					load: configs,
					validationSchema: envValidationSchema,
					isGlobal: true,
				}),
				JwtModule.registerAsync({
					imports: [ConfigModule],
					useFactory: async (configService: ConfigService) => ({
						secret: configService.get('jwt.secret'),
						signOptions: configService.get('jwt.signOptions'),
					}),
					inject: [ConfigService],
				}),
				AppModule,
			],
		}).compile()
		app = moduleRef.createNestApplication()
		await app.init()
	}, TIMEOUT)

	beforeEach(() => {
		logger.debug('===========================================')
		logger.log('🧪 ' + expect.getState().currentTestName)
		logger.debug('===========================================')
	})

	describe('Failed Login', () => {
		it('Missing username', async function () {
			const result = await request(app.getHttpServer())
				.post(`/auth/login`)
				.send({
					password: 'test',
				})
				.expect(401)
			expect(result.body).toBeDefined()
			expect(result.body.statusCode).toEqual(401)
		})

		it('Missing password', async () => {
			const result = await request(app.getHttpServer())
				.post(`/auth/login`)
				.send({
					username: 'test@test.com',
				})
				.expect(401)
			expect(result.body).toBeDefined()
			expect(result.body.statusCode).toEqual(401)
		})

		it('Wrong username', async () => {
			const result = await request(app.getHttpServer())
				.post(`/auth/login`)
				.send({
					username: 'wrong@username.com',
					password: 'test',
				})
				.expect(401)
			expect(result.body).toBeDefined()
			expect(result.body.statusCode).toEqual(401)
			expect(result.body.message).toEqual('Unauthorized')
		})

		it('Wrong password', async () => {
			const result = await request(app.getHttpServer())
				.post(`/auth/login`)
				.send({
					username: 'wrong@username.com',
					password: 'wrong',
				})
				.expect(401)
			expect(result.body).toBeDefined()
			expect(result.body.statusCode).toEqual(401)
			expect(result.body.message).toEqual('Unauthorized')
		})
	})

	describe('Successful Login', () => {
		it('Correct username & password', async () => {
			const result = await request(app.getHttpServer())
				.post(`/auth/login`)
				.send({
					username: 'test@test.com',
					password: 'test',
				})
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.access_token).toBeDefined()
			access_token = getCookieValueFromHeader(result, ACCESS_TOKEN_COOKIE_NAME) // cookie token
			refresh_token = getCookieValueFromHeader(result, REFRESH_TOKEN_COOKIE_NAME) // cookie token
			expect(access_token).toBeDefined()
			expect(refresh_token).toBeDefined()
		})
	})

	describe('Access Token Works', () => {
		it('Get Profile (Bearer header)', async () => {
			const result = await request(app.getHttpServer())
				.get(`/auth/profile`)
				.set('Authorization', `Bearer ${access_token}`)
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.email).toBeDefined()
		})

		it('Get Profile (Cookie token)', async () => {
			const result = await request(app.getHttpServer())
				.get(`/auth/profile`)
				.set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${access_token}`)
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.email).toBeDefined()
		})

		it('Get Profile With Relations', async () => {
			const result = await request(app.getHttpServer())
				.get(`/auth/profile?relations=UserApiKey`)
				.set('Authorization', `Bearer ${access_token}`)
				.expect(200)
			expect(result.body).toBeDefined()
			expect(result.body.email).toBeDefined()
			expect(result.body.UserApiKey).toBeDefined()
			expect(result.body.UserApiKey.length).toBeGreaterThan(0)
			expect(result.body.UserApiKey[0].apiKey).toBeDefined()
		})
	})

	describe('Refresh', () => {
		it('Sets new access token and refresh token cookies', async () => {
			const result = await request(app.getHttpServer())
				.post(`/auth/refresh`)
				.set('Cookie', `${REFRESH_TOKEN_COOKIE_NAME}=${refresh_token}`)
				.then(async res => {
					try {
						const accessToken = getCookieValueFromHeader(res, ACCESS_TOKEN_COOKIE_NAME) // cookie token
						expect(res.body.access_token).toBeDefined() // bearer token
						expect(accessToken).toBeDefined()
					} catch (e) {
						console.error(res.headers)
						expect(e).toMatch('error')
					}
				})
				.catch(async e => {
					expect(e).toMatch('error')
				})
		})
	})

	describe('Logout', () => {
		it('Clears access token and refresh token cookies', async () => {
			const result = await request(app.getHttpServer())
				.post(`/auth/logout`)
				.set('Cookie', `${ACCESS_TOKEN_COOKIE_NAME}=${access_token}`)
				.then(async res => {
					try {
						const accessToken = getCookieValueFromHeader(res, ACCESS_TOKEN_COOKIE_NAME) // cookie token
						const refreshToken = getCookieValueFromHeader(res, REFRESH_TOKEN_COOKIE_NAME) // cookie token
						expect(accessToken).toBeFalsy()
						expect(refreshToken).toBeFalsy()
						expect(res.body.success).toBeTruthy()
					} catch (e) {
						console.error(res.headers)
						expect(e).toMatch('error')
					}
				})
				.catch(async e => {
					expect(e).toMatch('error')
				})
		})
	})

	afterAll(async () => {
		await app.close()
	}, TIMEOUT)
})

export function getCookieValueFromHeader(res: any, cookieName: string) {
	const cookies: Array<string> = castArray(res.headers['set-cookie'])
	const cookie = cookies.find(cookie => cookie.startsWith(cookieName + '='))
	return cookie?.split('=')[1].split(';')[0]
}
