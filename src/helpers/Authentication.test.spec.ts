import { Test, TestingModule } from '@nestjs/testing'
import { Authentication } from './Authentication'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { JwtService } from '@nestjs/jwt'
import { Query } from './Query'
import { Schema } from './Schema'
import { Roles } from './Roles'
import { RolePermission } from '../types/roles.types'
import { Logger } from './Logger'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../app.service.auth'
import { JwtModule } from '@nestjs/jwt'
import { AuthLocation } from '../types/auth.types'
import { LLANA_AUTH_TABLE } from '../app.constants'

describe('Authentication Helper', () => {
	let authentication: Authentication
	let cacheManager: Cache
	let jwtService: JwtService
	let query: Query
	let schema: Schema
	let roles: Roles
	let authService: AuthService
	const cacheKey = 'auth:rules:JWT'

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [
				JwtModule.register({
					secret: 'test-secret-key', // Match the secret used in JwtService mock
					signOptions: { expiresIn: '1h' },
				}),
			],
			providers: [
				Authentication,
				{
					provide: CACHE_MANAGER,
					useValue: {
						get: jest.fn(),
						set: jest.fn(),
						reset: jest.fn(),
					},
				},
				{
					provide: JwtService,
					useValue: {
						signAsync: jest.fn().mockImplementation(payload => {
							const jwt = require('jsonwebtoken')
							const secret = 'test-secret-key'
							return Promise.resolve(
								jwt.sign(payload, secret, {
									expiresIn: '1h',
								}),
							)
						}),
						verifyAsync: jest.fn().mockImplementation(token => {
							const jwt = require('jsonwebtoken')
							const secret = 'test-secret-key'
							try {
								const decoded = jwt.verify(token, secret)
								return Promise.resolve(decoded)
							} catch (error) {
								throw error
							}
						}),
					},
				},
				{
					provide: Query,
					useValue: {
						perform: jest.fn().mockResolvedValue({
							data: [
								{
									type: 'EXCLUDE',
									table: 'Employee',
									rule: {
										public_records: RolePermission.READ,
									},
								},
							],
						}),
					},
				},
				{
					provide: Schema,
					useValue: {
						getSchema: jest.fn().mockImplementation((options: { table: string }) => {
							if (options.table === 'Employee') {
								return Promise.resolve({
									table: 'Employee',
									columns: [
										{ name: 'id', type: 'number', primary: true },
										{ name: 'name', type: 'string' },
									],
									primary_key: 'id',
								})
							}
							if (options.table === LLANA_AUTH_TABLE) {
								return Promise.resolve({
									table: LLANA_AUTH_TABLE,
									columns: [
										{ name: 'id', type: 'number', primary: true },
										{ name: 'type', type: 'string' },
										{ name: 'table', type: 'string' },
										{ name: 'rule', type: 'json' },
									],
									primary_key: 'id',
								})
							}
							return Promise.reject(new Error(`No Schema Found For Table ${options.table}`))
						}),
					},
				},
				{
					provide: Roles,
					useValue: {
						rolePass: jest.fn().mockImplementation((required: RolePermission, provided: RolePermission) => {
							return required === provided || required < provided
						}),
					},
				},
				{
					provide: Logger,
					useValue: {
						error: jest.fn(),
						debug: jest.fn(),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn().mockImplementation((key: string) => {
							if (key === 'auth') {
								return [
									{
										type: 'JWT',
										location: AuthLocation.HEADER,
									},
								]
							}
							if (key === 'JWT_KEY') {
								return 'test-secret-key'
							}
							return null
						}),
					},
				},
				{
					provide: AuthService,
					useValue: {
						signIn: jest.fn(),
					},
				},
			],
		}).compile()

		authentication = module.get<Authentication>(Authentication)
		cacheManager = module.get(CACHE_MANAGER)
		jwtService = module.get(JwtService)
		query = module.get(Query)
		schema = module.get(Schema)
		roles = module.get(Roles)
		authService = module.get(AuthService)
	})

	describe('Public Access - EXCLUDE Rules', () => {
		beforeEach(() => {
			// Set up cache mock to store and return rules
			const cachedRules = {
				data: [
					{
						type: 'EXCLUDE',
						table: 'Employee',
						rule: {
							public_records: RolePermission.READ,
						},
					},
				],
			}
			jest.spyOn(cacheManager, 'get').mockImplementation(key => {
				if (key === cacheKey) return Promise.resolve(null) // First call returns null
				return Promise.resolve(cachedRules) // Subsequent calls return cached rules
			})
			jest.spyOn(query, 'perform').mockResolvedValue(cachedRules)
			jest.spyOn(roles, 'rolePass').mockReturnValue(true)
		})

		it('should allow public READ access for excluded Employee table', async () => {
			const result = await authentication.auth({
				table: 'Employee',
				access: RolePermission.READ,
				headers: {},
				body: {},
				query: {},
			})

			expect(result.valid).toBe(true)
			expect(result.message).toBe('Public Access Granted')
		})

		it('should deny public WRITE access for excluded Employee table', async () => {
			const result = await authentication.auth({
				table: 'Employee',
				access: RolePermission.WRITE,
				headers: {},
				body: {},
				query: {},
			})

			expect(result.valid).toBe(false)
			expect(result.message).toBe('JWT Authentication Required')
		})

		it('should allow authenticated WRITE access for excluded Employee table', async () => {
			const token = await jwtService.signAsync({ sub: 'test-user' })

			const result = await authentication.auth({
				table: 'Employee',
				access: RolePermission.WRITE,
				headers: { Authorization: `Bearer ${token}` },
				body: {},
				query: {},
			})

			expect(result.valid).toBe(true)
			expect(result.message).toBe('JWT Authentication Successful')
		})

		it('should deny access for non-existent table', async () => {
			const result = await authentication.auth({
				table: 'NonExistentTable',
				access: RolePermission.READ,
				headers: {},
				body: {},
				query: {},
			})

			expect(result.valid).toBe(false)
			expect(result.message).toBe('No Schema Found For Table NonExistentTable')
		})

		it('should deny access with invalid JWT token', async () => {
			const result = await authentication.auth({
				table: 'Employee',
				access: RolePermission.WRITE,
				headers: { Authorization: `Bearer ${Buffer.from('invalid').toString('base64')}` },
				body: {},
				query: {},
			})

			expect(result.valid).toBe(false)
			expect(result.message).toBe('JWT Authentication Failed')
		})
	})

	describe('Cache Management', () => {
		let cachedRules: any

		beforeEach(() => {
			// Set up cache mock to store and return rules
			cachedRules = {
				data: [
					{
						type: 'EXCLUDE',
						table: 'Employee',
						rule: {
							public_records: RolePermission.READ,
						},
					},
				],
			}

			// Reset all mocks
			jest.clearAllMocks()

			jest.spyOn(cacheManager, 'get').mockImplementation(key => {
				return Promise.resolve(key === cacheKey ? null : cachedRules)
			})
			jest.spyOn(query, 'perform').mockResolvedValue(cachedRules)
			jest.spyOn(roles, 'rolePass').mockReturnValue(true)
		})

		it('should cache and reuse authentication rules', async () => {
			// First call - should query and cache
			const result1 = await authentication.auth({
				table: 'Employee',
				access: RolePermission.READ,
				headers: {},
				body: {},
				query: {},
			})

			expect(result1.valid).toBe(true)
			expect(result1.message).toBe('Public Access Granted')

			// Update cache mock to simulate cached data
			jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedRules)

			// Second call - should use cache
			const result2 = await authentication.auth({
				table: 'Employee',
				access: RolePermission.READ,
				headers: {},
				body: {},
				query: {},
			})

			expect(result2.valid).toBe(true)
			expect(result2.message).toBe('Public Access Granted')
			expect(query.perform).toHaveBeenCalledTimes(1) // Should only query once
		})
	})
})
