import { Injectable } from '@nestjs/common'
import { AuthService } from '../app.service.auth'
import { RolePermission } from '../types/roles.types'
import { Query } from '../helpers/Query'
import { Schema } from '../helpers/Schema'
import { LLANA_AUTH_TABLE, LLANA_ROLES_TABLE } from '../app.constants'
import { QueryPerform, DataSourceColumnType } from '../types/datasource.types'
import { ConfigService } from '@nestjs/config'
import { Auth, AuthJWT, AuthPasswordEncryption, AuthType } from '../types/auth.types'
import { Encryption } from '../helpers/Encryption'

@Injectable()
export class AuthTestingService {
	constructor(
		private readonly authService: AuthService,
		private readonly query: Query,
		private readonly schema: Schema,
		private readonly configService: ConfigService,
		private readonly encryption: Encryption,
	) {}

	async login(role?: string): Promise<string> {
		try {
			// Generate a unique email using timestamp
			const timestamp = Date.now()
			const username = role ? `test_${role}_${timestamp}@test.com` : `test_${timestamp}@test.com`
			const password = 'test'
			await this.createTestUser(username, password)
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
					table: 'SalesOrder' // Default to SalesOrder table for testing
				}
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

		const hashedPassword = await this.encryption.encrypt(
			jwtAuthConfig.password.encryption || AuthPasswordEncryption.BCRYPT,
			password,
			jwtAuthConfig.password.salt
		)

		await this.query.perform(QueryPerform.CREATE, {
			schema,
			data: {
				email: username,
				password: hashedPassword,
				role: 'USER',  // Use default USER role
				firstName: 'Test',
				lastName: 'User'
			}
		})
	}
}
