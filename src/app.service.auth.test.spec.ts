import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigModule, ConfigService, ConfigFactory } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { AppModule } from './app.module'
import { AuthService } from './app.service.auth'
import { Logger } from './helpers/Logger'
import { TIMEOUT } from './testing/testing.const'
import { RolePermission } from './types/roles.types'
import { Authentication } from './helpers/Authentication'

// Import configs
import auth from './config/auth.config'
import database from './config/database.config'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { envValidationSchema } from './config/env.validation'

// Type the config imports
const configs: ConfigFactory[] = [auth, database, hosts, jwt, roles]

describe('Login Service', () => {
	let app: INestApplication
	let service: AuthService
	let authentication: Authentication
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

		service = app.get<AuthService>(AuthService)
		authentication = app.get<Authentication>(Authentication)
	}, TIMEOUT)

	beforeEach(() => {
		logger.debug('===========================================')
		logger.log('🧪 ' + expect.getState().currentTestName)
		logger.debug('===========================================')
	})

	describe('Failed Login', () => {
		it('Missing username', async () => {
			try {
				const access_token = await service.signIn('', 'password')
				expect(access_token).toBeUndefined()
			} catch (e) {
				expect(e.message).toBe('Username is required')
			}
		})

		it('Missing password', async () => {
			try {
				const access_token = await service.signIn('test@test.com', '')
				expect(access_token).toBeUndefined()
			} catch (e) {
				expect(e.message).toBe('Password is required')
			}
		})

		it('Wrong username', async () => {
			try {
				const access_token = await service.signIn('wrong@username.com', 'test')
				expect(access_token).toBeUndefined()
			} catch (e) {
				expect(e.message).toBe('Unauthorized')
			}
		})

		it('Wrong password', async () => {
			try {
				const access_token = await service.signIn('test@test.com', 'wrong')
				expect(access_token).toBeUndefined()
			} catch (e) {
				expect(e.message).toBe('Unauthorized')
			}
		})
	})

	describe('Successful Login', () => {
		it('Correct username & password', async () => {
			try {
				const result = await service.signIn('test@test.com', 'test')
				expect(result).toBeDefined()
				expect(result.access_token).toBeDefined()
				expect(result.id).toBeDefined()
			} catch (e) {
				logger.error(e.message)
				expect(e).toBeUndefined()
			}
		})
	})

	describe('Public Access Integration', () => {
		it('should allow public access to Employee table', async () => {
			const result = await authentication.auth({
				table: 'Employee',
				access: RolePermission.READ,
				headers: {},
				body: {},
				query: {},
			})
			expect(result.valid).toBe(true)
		})

		it('should respect permission levels for public access', async () => {
			const writeResult = await authentication.auth({
				table: 'Employee',
				access: RolePermission.WRITE,
				headers: {},
				body: {},
				query: {},
			})
			expect(writeResult.valid).toBe(false)
		})
	})

	afterAll(async () => {
		await app.close()
	})
})
