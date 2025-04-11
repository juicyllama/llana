import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { FindOneResponseObject } from './dtos/response.dto'
import { Logger } from './helpers/Logger'
import { Schema } from './helpers/Schema'
import { Auth, AuthType } from './types/auth.types'

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
	private authSchema: any
	constructor(
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
		private readonly logger: Logger,
		private readonly schema: Schema,
	) {}

	private async getUserPK() {
		if (!this.authSchema) {
			const authentications = this.configService.get<Auth[]>('auth')
			const jwtAuthConfig = authentications.find(auth => auth.type === AuthType.JWT)
			this.authSchema = await this.schema.getSchema({ table: jwtAuthConfig.table.name })
		}
		return this.authSchema.primary_key
	}

	async getUserId(jwt: string): Promise<any> {
		const payload = await this.jwtService.verifyAsync(jwt)
		return payload.sub
	}

	private async constructLoginPayload(user: User | LoginPayload) {
		const payload = { sub: user[await this.getUserPK()] || user.sub, email: user.email } // in case of User object
		if (!payload.sub || !payload.email) {
			throw new UnauthorizedException('Invalid user object')
		}
		return payload
	}

	async login(user: any): Promise<{ access_token: string }> {
		const payload = await this.constructLoginPayload(user)
		const access_token = this.jwtService.sign(payload, {
			secret: process.env.JWT_KEY,
			expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
		})
		return { access_token }
	}

	async createRefreshToken(user: User | LoginPayload) {
		if (!process.env.JWT_REFRESH_KEY) {
			throw new Error('JWT_REFRESH_KEY not found')
		}
		const payload = await this.constructLoginPayload(user)

		return this.jwtService.sign(payload, {
			secret: process.env.JWT_REFRESH_KEY,
			expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '14d',
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
