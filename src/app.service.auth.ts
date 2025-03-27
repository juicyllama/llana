import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { DEFAULT_ACCESS_TOKEN_EXPIRY_MINUTES, DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS } from './auth/auth.constants'
import { FindOneResponseObject } from './dtos/response.dto'
import { Logger } from './helpers/Logger'
import { Auth, AuthType } from './types/auth.types'
import { Env } from './utils/Env'

type LoginPayload = {
	sub: string
	email: string
}

type User = FindOneResponseObject & {
	email: string
	id: number
}

@Injectable()
export class AuthService {
	constructor(
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
		private readonly logger: Logger,
	) {}

	async getUserId(jwt: string): Promise<any> {
		const payload = await this.jwtService.verifyAsync(jwt)
		return payload.sub
	}

	constructLoginPayload(user: User | LoginPayload) {
		const payload = { sub: user.sub || user['id'], email: user.email } // in case of User object
		if (!payload.sub || !payload.email) {
			throw new UnauthorizedException('Invalid user object')
		}
		return payload
	}

	async login(user: any): Promise<{ access_token: string }> {
		const payload = this.constructLoginPayload(user)
		const authentications = this.configService.get<Auth[]>('auth')

		const jwtAuthConfig = authentications.find(auth => auth.type === AuthType.JWT)

		if (!jwtAuthConfig) {
			this.logger.error('JWT authentication not configured')
			throw new UnauthorizedException()
		}

		const access_token = this.jwtService.sign(payload, {
			secret: process.env.JWT_KEY,
			expiresIn: `${Env.IsTest() ? 60 : process.env.JWT_ACCESS_TOKEN_EXPIRY_MINUTES || DEFAULT_ACCESS_TOKEN_EXPIRY_MINUTES}m`,
		})
		return { access_token }
	}

	async createRefreshToken(user: User | LoginPayload) {
		if (!process.env.JWT_REFRESH_KEY) {
			throw new Error('JWT_REFRESH_KEY not found')
		}
		const payload = this.constructLoginPayload(user)

		return this.jwtService.sign(payload, {
			secret: process.env.JWT_REFRESH_KEY,
			expiresIn: `${process.env.JWT_REFRESH_TOKEN_EXPIRY_DAYS || DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS}d`,
		})
	}

	decodeRefreshToken(token: string): LoginPayload {
		if (!process.env.JWT_REFRESH_KEY) {
			throw new Error('JWT_REFRESH_KEY not found')
		}
		try {
			return this.jwtService.verify(token, {
				secret: process.env.JWT_REFRESH_KEY,
			})
		} catch {
			throw new UnauthorizedException('Invalid refresh token')
		}
	}
}
