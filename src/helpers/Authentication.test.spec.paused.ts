import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import axios from 'axios'

import { AppModule } from '../app.module'
import { Logger } from './Logger'

describe('Authentication', () => {
	let app: INestApplication
	let configService: ConfigService
	let axiosInstance: any
	let logger: Logger

	const testing = {
		host: 'localhost',
		port: 0,
		address: '',
	}

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile()

		app = moduleRef.createNestApplication()

		configService = app.get<ConfigService>(ConfigService)
		logger = app.get<Logger>(Logger)

		await app.listen(
			Number(configService.get<number>('PORT_TESTING')) ?? Number(configService.get<number>('PORT')) + 1,
			testing.host,
		)
		await app.init()

		testing.port = app.getHttpServer().address().port
		testing.address = `http://${testing.host}:${testing.port}`

		axiosInstance = axios.create({
			baseURL: testing.address,
			headers: {
				'x-api-key': 'test',
				Accept: 'application/json',
			},
		})
	})

	describe('Hosts', () => {
		it('No hosts provided in config', async function () {
			configService.set('hosts', [])
			try {
				const response = await axiosInstance.get('/User/1')
				expect(response.status).toEqual(200)
			} catch (e) {
				logger.error(e.message, e)
				expect(true).toEqual(false)
			}
		})

		it('Single host should pass', async function () {
			configService.set('hosts', [`${testing.host}:${testing.port}`])
			try {
				const response = await axiosInstance.get('/User/1')
				expect(response.status).toEqual(200)
			} catch (e) {
				logger.error(e.message, e)
				expect(true).toEqual(false)
			}
		})

		it('Single host should fail', async function () {
			configService.set('hosts', ['google.com'])
			try {
				await axiosInstance.get('/User/1')
			} catch (e) {
				expect(e.response.status).toEqual(403)
			}
		})
	})

	afterEach(async () => {
		await app.close()
	})
})
