import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Response } from 'express'

import { AuthController } from './app.controller.auth'
import { AuthService } from './app.service.auth'
import { Authentication } from './helpers/Authentication'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'
import { Response as ResponseHelper } from './helpers/Response'
import { Schema } from './helpers/Schema'

/**
 * Test for GitHub Issue #235 - Circular reference error fix
 * This test verifies that the login and refresh endpoints return plain objects
 * instead of Express response objects, preventing circular reference errors
 */
describe('AuthController - Circular Reference Fix (#235)', () => {
	let authController: AuthController
	let authService: AuthService
	let mockResponse: Partial<Response>

	beforeEach(async () => {
		// Mock response object
		mockResponse = {
			cookie: jest.fn(),
			clearCookie: jest.fn(),
			status: jest.fn().mockReturnThis(),
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{
					provide: AuthService,
					useValue: {
						login: jest.fn().mockResolvedValue({ access_token: 'mock-access-token' }),
						createRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
						decodeRefreshToken: jest.fn().mockReturnValue({ sub: '1', email: 'test@test.com' }),
					},
				},
				{
					provide: Authentication,
					useValue: {
						skipAuth: jest.fn().mockReturnValue(false),
					},
				},
				{
					provide: Query,
					useValue: {},
				},
				{
					provide: ResponseHelper,
					useValue: {
						text: jest.fn((text) => text),
					},
				},
				{
					provide: Schema,
					useValue: {},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn(),
					},
				},
				{
					provide: JwtService,
					useValue: {},
				},
				{
					provide: Logger,
					useValue: {
						log: jest.fn(),
					},
				},
			],
		}).compile()

		authController = module.get<AuthController>(AuthController)
		authService = module.get<AuthService>(AuthService)

		// Set environment variables for JWT expiry
		process.env.JWT_EXPIRES_IN = '15m'
		process.env.JWT_REFRESH_EXPIRES_IN = '14d'
	})

	describe('login endpoint', () => {
		it('should return a plain object instead of Express response object', async () => {
			const mockRequest = {
				user: { id: 1, email: 'test@test.com' },
			}

			const result = await authController.login(mockRequest as any, mockResponse as any)

			// Verify that the result is a plain object, not an Express response
			expect(result).toEqual({
				access_token: 'mock-access-token',
				expires_in: 900, // 15 minutes in seconds
				refresh_token_expires_in: 1209600, // 14 days in seconds
			})

			// Verify that the result is serializable (no circular references)
			expect(() => JSON.stringify(result)).not.toThrow()

			// Verify that cookies were set
			expect(mockResponse.cookie).toHaveBeenCalledTimes(2)
		})

		it('should not return an Express response object that causes circular references', async () => {
			const mockRequest = {
				user: { id: 1, email: 'test@test.com' },
			}

			const result = await authController.login(mockRequest as any, mockResponse as any)

			// Ensure the result doesn't have Express response properties that cause circular references
			expect(result).not.toHaveProperty('req')
			expect(result).not.toHaveProperty('socket')
			expect(result).not.toHaveProperty('connection')
			expect(result).not.toHaveProperty('_header')
			expect(result).not.toHaveProperty('statusCode')
			expect(result).not.toHaveProperty('statusMessage')

			// Verify it's a simple object with expected properties
			expect(typeof result).toBe('object')
			expect(result).toHaveProperty('access_token')
			expect(result).toHaveProperty('expires_in')
			expect(result).toHaveProperty('refresh_token_expires_in')
		})
	})

	describe('refresh endpoint', () => {
		it('should return a plain object instead of Express response object', async () => {
			const mockRequest = {
				headers: {
					cookie: 'refreshToken=mock-refresh-token',
				},
			}

			const result = await authController.refresh(mockRequest as any, mockResponse as any)

			// Verify that the result is a plain object, not an Express response
			expect(result).toEqual({
				access_token: 'mock-access-token',
				expires_in: 900, // 15 minutes in seconds
				refresh_token_expires_in: 1209600, // 14 days in seconds
			})

			// Verify that the result is serializable (no circular references)
			expect(() => JSON.stringify(result)).not.toThrow()

			// Verify that cookies were set
			expect(mockResponse.cookie).toHaveBeenCalledTimes(2)
		})

		it('should return error text when no refresh token found', async () => {
			const mockRequest = {
				headers: {},
			}

			const result = await authController.refresh(mockRequest as any, mockResponse as any)

			// Should return plain text, not Express response object
			expect(result).toBe('No refresh token found')
			expect(typeof result).toBe('string')

			// Verify that the result is serializable (no circular references)
			expect(() => JSON.stringify(result)).not.toThrow()

			// Verify status was set to 401
			expect(mockResponse.status).toHaveBeenCalledWith(401)
		})

		it('should not return an Express response object that causes circular references', async () => {
			const mockRequest = {
				headers: {
					cookie: 'refreshToken=mock-refresh-token',
				},
			}

			const result = await authController.refresh(mockRequest as any, mockResponse as any)

			// Ensure the result doesn't have Express response properties that cause circular references
			expect(result).not.toHaveProperty('req')
			expect(result).not.toHaveProperty('socket')
			expect(result).not.toHaveProperty('connection')
			expect(result).not.toHaveProperty('_header')
			expect(result).not.toHaveProperty('statusCode')
			expect(result).not.toHaveProperty('statusMessage')

			// Verify it's a simple object with expected properties
			expect(typeof result).toBe('object')
			expect(result).toHaveProperty('access_token')
			expect(result).toHaveProperty('expires_in')
			expect(result).toHaveProperty('refresh_token_expires_in')
		})
	})

	describe('logout endpoint', () => {
		it('should return a plain object (already working correctly)', async () => {
			const result = await authController.logout(mockResponse as any)

			// Verify that the result is a plain object
			expect(result).toEqual({
				success: true,
			})

			// Verify that the result is serializable (no circular references)
			expect(() => JSON.stringify(result)).not.toThrow()

			// Verify that cookies were cleared
			expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2)
		})
	})
})
