import { Body, Controller, Headers, Post } from '@nestjs/common'

import { LoginService } from './app.service.auth'
import { HeaderParams } from './dtos/requests.dto'

@Controller('auth')
export class AuthController {
	constructor(private readonly loginService: LoginService) {}

	@Post('/login')
	login(
		@Body() signInDto: Record<string, any>,
		@Headers() headers: HeaderParams,
	): Promise<{ access_token: string; id: any }> {
		const x_request_id = headers['x-request-id']
		return this.loginService.signIn(signInDto.username, signInDto.password, x_request_id)
	}
}
