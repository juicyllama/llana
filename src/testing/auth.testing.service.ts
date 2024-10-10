import { Injectable } from '@nestjs/common'

import { AuthService } from '../app.service.auth'

@Injectable()
export class AuthTestingService {
	constructor(private readonly authService: AuthService) {}

	async login(): Promise<string> {
		const username = 'test@test.com'
		const password = 'test'
		const payload = await this.authService.signIn(username, password)
		return payload.access_token
	}
}
