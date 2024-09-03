import { Controller, Post, Body } from '@nestjs/common'
//import { Logger } from './helpers/Logger'
import { LoginService } from './app.service.login'

@Controller()
export class PostController {
	constructor(
		private readonly loginService: LoginService,
		//private readonly logger: Logger,
	) {}

	@Post('/login')
	signIn(@Body() signInDto: Record<string, any>) {
		return this.loginService.signIn(signInDto.username, signInDto.password)
	}
}
