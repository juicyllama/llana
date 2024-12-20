import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'

import { LLANA_ROLES_TABLE } from '../app.constants'
import { AuthService } from '../app.service.auth'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { Auth, AuthJWT, AuthType } from '../types/auth.types'
import { DataSourceColumnType, QueryPerform } from '../types/datasource.types'
import { RolePermission } from '../types/roles.types'

@Injectable()
export class AuthTestingService {
	constructor(
		private readonly authService: AuthService,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly configService: ConfigService,
	) {}

	async login(role?: string): Promise<string> {
		try {
			// Generate a unique email using timestamp
			const timestamp = Date.now()
			const username = role ? `test_${role}_${timestamp}@test.com` : `test_${timestamp}@test.com`
			const password = 'test'

			// Create test user first
			await this.createTestUser(username, password)

			// Then attempt login with same password
			const payload = await this.authService.signIn(username, password)
			return payload.access_token
		} catch (error) {
			console.error('Login failed:', error)
			throw error
		}
	}

	async loginWithRestrictedFields(restrictedFields: string[]): Promise<string> {
		try {
			const username = 'test_restricted@test.com'
			const password = 'test'

			// Create test user
			await this.createTestUser(username, password)

			// Get the roles table schema
			const schema = await this.schema.getSchema({ table: LLANA_ROLES_TABLE })

			// Create role with restricted fields
			await this.query.perform(QueryPerform.CREATE, {
				schema,
				data: {
					custom: true,
					role: 'RESTRICTED_USER',
					records: RolePermission.READ,
					restricted_fields: restrictedFields.join(','),
					table: 'SalesOrder', // Default to SalesOrder table for testing
				},
			})

			const payload = await this.authService.signIn(username, password)
			return payload.access_token
		} catch (error) {
			console.error('Login failed:', error)
			throw error
		}
	}

	private async createTestUser(username: string, password: string): Promise<void> {
		const authentications = this.configService.get<Auth[]>('auth')
		const jwtConfig = authentications?.find(auth => auth.type === AuthType.JWT)

		if (!jwtConfig) {
			throw new Error('JWT authentication not configured properly')
		}

		const jwtAuthConfig = jwtConfig.table as AuthJWT
		const schema = await this.schema.getSchema({ table: 'User' })

		// Get role column definition to check valid values
		const roleColumn = schema.columns.find(col => col.field === 'role')
		if (!roleColumn || roleColumn.type !== DataSourceColumnType.ENUM) {
			throw new Error('Role column not properly configured in User table')
		}

		// Clean password before hashing
		const cleanPassword = String(password).trim()

		// Use salt rounds from config, defaulting to 10 if not set
		const saltRounds = Number(jwtAuthConfig.password.salt) || 10
		const hashedPassword = await bcrypt.hash(cleanPassword, saltRounds)

		await this.query.perform(QueryPerform.CREATE, {
			schema,
			data: {
				email: username,
				password: hashedPassword,
				role: 'USER', // Use default USER role
				firstName: 'Test',
				lastName: 'User',
			},
		})
	}
}
