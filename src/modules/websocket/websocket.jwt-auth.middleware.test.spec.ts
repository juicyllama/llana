import { Test } from '@nestjs/testing'
import { Authentication } from '../../helpers/Authentication'
import { HostCheckMiddleware } from '../../middleware/HostCheck'
import { Logger } from '../../helpers/Logger'
import { RolePermission } from '../../types/roles.types'
import { WebsocketJwtAuthMiddleware } from './websocket.jwt-auth.middleware'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

describe('WebsocketJwtAuthMiddleware', () => {
	let authentication: Authentication
	let hostCheckMiddleware: HostCheckMiddleware
	let middleware: ReturnType<typeof WebsocketJwtAuthMiddleware>
	let mockSocket: any
	let mockNext: jest.Mock

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				{
					provide: Authentication,
					useValue: {
						public: jest.fn(),
						auth: jest.fn(),
						skipAuth: jest.fn(),
					},
				},
				{
					provide: HostCheckMiddleware,
					useValue: {
						validateHost: jest.fn(),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn(),
					},
				},
				{
					provide: JwtService,
					useValue: {
						verifyAsync: jest.fn(),
					},
				},
				Logger,
			],
		}).compile()

		authentication = moduleRef.get<Authentication>(Authentication)
		hostCheckMiddleware = moduleRef.get<HostCheckMiddleware>(HostCheckMiddleware)
		middleware = WebsocketJwtAuthMiddleware(authentication, hostCheckMiddleware)

		mockNext = jest.fn()
		mockSocket = {
			handshake: {
				headers: {
					'x-llana-table': 'test_table',
					'x-request-id': 'test-request-id',
				},
			},
			user: {},
		}

		// Default host check to pass
		jest.spyOn(hostCheckMiddleware, 'validateHost').mockReturnValue(true)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should reject connection when no table is provided', async () => {
		delete mockSocket.handshake.headers['x-llana-table']

		await middleware(mockSocket, mockNext)

		expect(mockNext).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('No Table Provided'),
			}),
		)
	})

	it('should reject connection when host check fails', async () => {
		jest.spyOn(hostCheckMiddleware, 'validateHost').mockReturnValue(false)

		await middleware(mockSocket, mockNext)

		expect(mockNext).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Forbidden',
			}),
		)
	})

	it('should allow access to public tables without authentication', async () => {
		jest.spyOn(authentication, 'public').mockResolvedValue({
			valid: true,
			allowed_fields: ['field1', 'field2'],
		})

		await middleware(mockSocket, mockNext)

		expect(authentication.public).toHaveBeenCalledWith({
			table: 'test_table',
			access_level: RolePermission.READ,
			x_request_id: 'test-request-id',
		})
		expect(mockSocket.user).toEqual({
			sub: 'public',
			table: 'test_table',
		})
		expect(mockNext).toHaveBeenCalledWith()
	})

	it('should reject access to private tables without authentication', async () => {
		// Public check fails
		jest.spyOn(authentication, 'public').mockResolvedValue({
			valid: false,
		})

		// Skip auth is false
		jest.spyOn(authentication, 'skipAuth').mockReturnValue(false)

		// Auth check fails
		jest.spyOn(authentication, 'auth').mockResolvedValue({
			valid: false,
			message: 'Authentication failed',
		})

		await middleware(mockSocket, mockNext)

		expect(authentication.public).toHaveBeenCalled()
		expect(authentication.auth).toHaveBeenCalled()
		expect(mockNext).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Authentication failed',
			}),
		)
	})

	it('should allow access to private tables with valid JWT', async () => {
		// Public check fails
		jest.spyOn(authentication, 'public').mockResolvedValue({
			valid: false,
		})

		// Skip auth is false
		jest.spyOn(authentication, 'skipAuth').mockReturnValue(false)

		// Auth check succeeds
		jest.spyOn(authentication, 'auth').mockResolvedValue({
			valid: true,
			user_identifier: '123',
		})

		await middleware(mockSocket, mockNext)

		expect(authentication.public).toHaveBeenCalled()
		expect(authentication.auth).toHaveBeenCalledWith({
			table: 'test_table',
			access: RolePermission.READ,
			headers: mockSocket.handshake.headers,
			x_request_id: 'test-request-id',
		})
		expect(mockSocket.user).toEqual({
			sub: '123',
			table: 'test_table',
		})
		expect(mockNext).toHaveBeenCalledWith()
	})

	it('should allow access when skipAuth is true', async () => {
		// Public check fails
		jest.spyOn(authentication, 'public').mockResolvedValue({
			valid: false,
		})

		// Skip auth is true
		jest.spyOn(authentication, 'skipAuth').mockReturnValue(true)

		await middleware(mockSocket, mockNext)

		expect(authentication.public).toHaveBeenCalled()
		expect(authentication.skipAuth).toHaveBeenCalled()
		expect(mockNext).toHaveBeenCalledWith()
	})

	it('should handle authentication errors gracefully', async () => {
		// Public check throws error
		jest.spyOn(authentication, 'public').mockRejectedValue(new Error('Database error'))

		await middleware(mockSocket, mockNext)

		expect(mockNext).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.any(String),
			}),
		)
	})
})
