import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { AuthService } from '../app.service.auth'

@Injectable()
export class AuthTestingService {
	constructor(
		private readonly authService: AuthService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {}

	async login(): Promise<string> {
		try {
			// Match the payload structure from AuthService.signIn
			const payload = {
				sub: 1, // Test user ID
				username: 'test@test.com',
			}

			// Use the same JWT configuration as the main service
			return this.jwtService.signAsync(payload, {
				secret: this.configService.get('jwt.secret'),
				...this.configService.get('jwt.signOptions'),
			})
		} catch (error) {
			console.error('Login failed:', error)
			throw error
		}
	}
}
