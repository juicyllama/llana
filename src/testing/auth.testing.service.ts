import { Injectable } from '@nestjs/common'
import { Logger } from '../helpers/Logger'
import { AuthService } from '../app.service.auth'

@Injectable()
export class AuthTestingService {
    constructor(
        private readonly authService: AuthService,
        private readonly logger: Logger,
    ) {}

    async login(): Promise<string> {
        try {
            this.logger.log('Attempting to login with test credentials...', 'auth-testing')
            const username = 'test@test.com'
            const password = 'test'
            const payload = await this.authService.signIn(username, password)
            this.logger.log('Login successful', 'auth-testing')
            return payload.access_token
        } catch (error) {
            this.logger.error(`Login failed: ${error.message}`, 'auth-testing')
            throw new Error(`Authentication failed: ${error.message}. Please ensure test credentials are properly initialized.`)
        }
    }
}
