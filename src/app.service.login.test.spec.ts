import { Test, TestingModule } from '@nestjs/testing'
import { LoginService } from './app.service.login'
import { AppModule } from './app.module'
import { Logger } from './helpers/Logger'

describe('Login Service', () => {
	let app: TestingModule
	let service: LoginService
	let logger: Logger

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		service = app.get<LoginService>(LoginService)
		logger = app.get<Logger>(Logger)
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
				const access_token = await service.signIn('test@test.com', 'test')
				expect(access_token).toBeDefined()
			} catch (e) {
				logger.error(e.message)
				expect(e).toBeUndefined()
			}
		})
	})

	afterAll(async () => {
		await app.close()
	})
})
