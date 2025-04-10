import {
	BadRequestException,
	Controller,
	Get,
	Headers,
	ParseArrayPipe,
	Post,
	Query as QueryParams,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common'
import { CookieOptions, Response as ExpressResponse } from 'express'

import { AuthService } from './app.service.auth'
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from './auth/auth.constants'
import { LocalAuthGuard } from './auth/guards/local-auth.guard'
import { HeaderParams } from './dtos/requests.dto'
import { FindOneResponseObject } from './dtos/response.dto'
import { Authentication } from './helpers/Authentication'
import { Logger } from './helpers/Logger'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Schema } from './helpers/Schema'
import { AuthenticatedRequest } from './types/auth.types'
import { DataSourceFindOneOptions, QueryPerform, WhereOperator } from './types/datasource.types'
import { RolePermission } from './types/roles.types'
import { Env } from './utils/Env'

@Controller('auth')
export class AuthController {
	logger = new Logger('AuthController')

	constructor(
		private readonly authService: AuthService,
		private readonly authentication: Authentication,
		private readonly query: Query,
		private readonly response: Response,
		private readonly schema: Schema,
	) {}

	/**
	 * Exchange a username and password for an access token
	 */

	@UseGuards(LocalAuthGuard)
	@Post('/login')
	async login(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: ExpressResponse): Promise<any> {
		if (this.authentication.skipAuth()) {
			throw new BadRequestException('Authentication is disabled')
		}

		const { access_token } = await this.authService.login(req.user)
		const refreshToken = await this.authService.createRefreshToken(req.user)
		setAccessAndRefreshTokenCookies(res, access_token, refreshToken)
		return res.status(200).json({
			access_token,
			expires_in: convertJwtExpiryToMs(process.env.JWT_EXPIRES_IN) / 1000,
			refresh_token_expires_in: convertJwtExpiryToMs(process.env.JWT_REFRESH_EXPIRES_IN) / 1000,
		})
	}

	@Post('refresh')
	async refresh(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: ExpressResponse): Promise<any> {
		const cookies = req.headers.cookie || ''
		const oldRefreshToken = cookies
			.split(';')
			.find(cookie => cookie.trim().startsWith(REFRESH_TOKEN_COOKIE_NAME + '='))
			?.split('=')[1]
		if (!oldRefreshToken) {
			return res.status(401).send('No refresh token found')
		}
		const loginPayload = this.authService.decodeRefreshToken(oldRefreshToken)
		const { access_token: newAccessToken } = await this.authService.login(loginPayload)
		const newRefreshToken = await this.authService.createRefreshToken(loginPayload)
		setAccessAndRefreshTokenCookies(res, newAccessToken, newRefreshToken)
		this.logger.log('Refreshed token', {
			sub: loginPayload.sub,
			oldRefreshToken: '...' + oldRefreshToken.slice(-10),
		})
		return res.status(200).json({
			access_token: newAccessToken,
			expires_in: convertJwtExpiryToMs(process.env.JWT_EXPIRES_IN) / 1000,
			refresh_token_expires_in: convertJwtExpiryToMs(process.env.JWT_REFRESH_EXPIRES_IN) / 1000,
		})
	}

	@Post('logout')
	async logout(@Res({ passthrough: true }) res: ExpressResponse): Promise<any> {
		res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, getAuthCookieOpts(false))
		res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, getAuthCookieOpts(true))
		return {
			success: true,
		}
	}

	/*
	 * Return the current user's profile, useful for testing the access token
	 */

	@Get('/profile')
	async profile(
		@Req() req,
		@Res() res,
		@Headers() headers: HeaderParams,
		@QueryParams('relations', new ParseArrayPipe({ items: String, separator: ',', optional: true }))
		queryRelations?: string[],
	): Promise<any> {
		if (this.authentication.skipAuth()) {
			throw new BadRequestException('Authentication is disabled')
		}

		const x_request_id = headers['x-request-id']
		const table = this.authentication.getIdentityTable()
		const auth = await this.authentication.auth({
			table,
			x_request_id,
			access: RolePermission.READ,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})
		if (!auth.valid) {
			return res.status(401).send(this.response.text(auth.message))
		}

		//return the user's profile
		const schema = await this.schema.getSchema({ table, x_request_id })
		const identity_column = await this.authentication.getIdentityColumn(x_request_id)

		const postQueryRelations = []

		try {
			if (queryRelations?.length) {
				const { valid, message, relations } = await this.schema.validateRelations({
					schema,
					relation_query: queryRelations,
					existing_relations: [],
					x_request_id,
				})

				if (!valid) {
					return res.status(400).send(this.response.text(message))
				}

				for (const relation of relations) {
					if (!postQueryRelations.find(r => r.table === relation.table)) {
						postQueryRelations.push(relation)
					}
				}
			}
		} catch (e) {
			return res.status(400).send(this.response.text(e.message))
		}

		const databaseQuery: DataSourceFindOneOptions = {
			schema,
			where: [
				{
					column: identity_column,
					operator: WhereOperator.equals,
					value: auth.user_identifier,
				},
			],
			relations: postQueryRelations,
		}

		let user = (await this.query.perform(
			QueryPerform.FIND_ONE,
			databaseQuery,
			x_request_id,
		)) as FindOneResponseObject

		if (postQueryRelations?.length) {
			user = await this.query.buildRelations(
				{
					schema,
					relations: postQueryRelations,
				} as DataSourceFindOneOptions,
				user,
				x_request_id,
			)
		}

		return res.status(200).send(user)
	}
}

function getAuthCookieOpts(isRefreshToken: boolean): CookieOptions {
	const domain = process.env.AUTH_COOKIES_DOMAIN || process.env.BASE_URL_API
	if (Env.IsProd() && !domain) {
		throw new Error('AUTH_COOKIES_DOMAIN or BASE_URL_API must be set in production')
	}
	const opts: CookieOptions = {
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: convertJwtExpiryToMs(isRefreshToken ? process.env.JWT_REFRESH_EXPIRES_IN : process.env.JWT_EXPIRES_IN),
		...(domain ? { domain } : {}),
		path: '/',
	}
	return opts
}

function setAccessAndRefreshTokenCookies(res: ExpressResponse, accessToken: string, refreshToken: string): void {
	res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, getAuthCookieOpts(false))
	res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getAuthCookieOpts(true))
}

function convertJwtExpiryToMs(expiry: string): number {
	const match = expiry.match(/^(\d+)([dms])$/)
	if (!match) {
		throw new Error('Invalid JWT expiry format. Use formats like "14d", "2m", "3s".')
	}

	const value = parseInt(match[1], 10)
	const unit = match[2]

	switch (unit) {
		case 'd': // days
			return value * 86400 * 1000
		case 'm': // minutes
			return value * 60 * 1000
		case 's': // seconds
			return value * 1000
		default:
			throw new Error('Unsupported time unit in JWT expiry format.')
	}
}
