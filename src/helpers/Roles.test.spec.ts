import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../app.module'
import axios from 'axios'
import { Role, RoleLocation, RolePermission } from '../types/roles.types'
import { Logger } from './Logger'

describe('Roles', () => {
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

		configService.set('hosts', [`${testing.host}:${testing.port}`])

		await app.listen(Number(configService.get<number>('PORT_TESTING')) ?? Number(configService.get<number>('PORT')) + 1, testing.host)
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

	describe('No Roles', () => {
		it('Empty config', async function () {
			configService.set('roles', {})
			try{
				const response = await axiosInstance.get('/users/1')
				expect(response.status).toEqual(200)
			}catch(e){
				logger.error(e.message, e)
				expect(true).toEqual(false)
			}
		})

		it('No defualts', async function () {
			configService.set('roles', {
				location: <RoleLocation>{
					table: 'users',
					column: 'role'
				},
			})
			try{
				await axiosInstance.get('/users/1')
			}catch(e){
				expect(e.response.status).toEqual(403)
			}
		})

		it('No admin role in defualts', async function () {
			configService.set('roles', {
				location: <RoleLocation>{
					table: 'users',
					column: 'role'
				},
				defaults: <Role[]>[{
					role: "VIEWER",
					records: RolePermission.WRITE,
				}],
			})
			try{
				await axiosInstance.get('/users/1')
			}catch(e){
				expect(e.response.status).toEqual(403)
			}
		})

	})

	describe('Default Roles', () => {
		//set different permissions and make sure we get the corret responses
	})

	describe('Profile Roles', () => {
		//Ensure it uses the correct profile, and the correct role, on the correct tables
	})


	afterEach(async () => {
		await app.close()
	})

})
