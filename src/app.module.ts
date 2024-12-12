import { CacheModule } from '@nestjs/cache-manager'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { ScheduleModule } from '@nestjs/schedule'
import Redis from 'ioredis'

import { AuthController } from './app.controller.auth'
import { DeleteController } from './app.controller.delete'
import { DocsController } from './app.controller.docs'
import { GetController } from './app.controller.get'
import { PostController } from './app.controller.post'
import { PutController } from './app.controller.put'
import { AuthService } from './app.service.auth'
import { AppBootup } from './app.service.bootup'
import { TasksService } from './app.service.tasks'
import auth from './config/auth.config'
import database from './config/database.config'
import { envValidationSchema } from './config/env.validation'
import hosts from './config/hosts.config'
import jwt from './config/jwt.config'
import roles from './config/roles.config'
import { Airtable } from './datasources/airtable.datasource'
import { Mongo } from './datasources/mongo.datasource'
import { MSSQL } from './datasources/mssql.datasource'
import { MySQL } from './datasources/mysql.datasource'
import { Postgres } from './datasources/postgres.datasource'
import { Authentication } from './helpers/Authentication'
import { Documentation } from './helpers/Documentation'
import { Encryption } from './helpers/Encryption'
import { Logger } from './helpers/Logger'
import { Pagination } from './helpers/Pagination'
import { Query } from './helpers/Query'
import { Response } from './helpers/Response'
import { Roles } from './helpers/Roles'
import { Schema } from './helpers/Schema'
import { Webhook } from './helpers/Webhook'
import { HostCheckMiddleware } from './middleware/HostCheck'
import { RedisMockWithPubSub } from './modules/websocket/redis-mock-with-pub-sub'
import { REDIS_PUB_CLIENT_TOKEN, REDIS_SUB_CLIENT_TOKEN } from './modules/websocket/websocket.constants'
import { WebsocketGateway } from './modules/websocket/websocket.gateway'
import { WebsocketService } from './modules/websocket/websocket.service'
import { Env } from './utils/Env'

const singleServerRedisPubsub = new RedisMockWithPubSub() // in-memory pubsub for testing or single server setup

function createPubSubOnlyRedisClient() {
	if (Env.IsTest() || !process.env.REDIS_PORT || !process.env.REDIS_HOST) {
		if (!Env.IsTest()) {
			new Logger().warn('REDIS_PORT or REDIS_HOST not found - Websockets will NOT work in a multi-instance setup')
		}
		return singleServerRedisPubsub
	}
	return new Redis(+process.env.REDIS_PORT, process.env.REDIS_HOST, {})
}

@Module({
	imports: [
		ConfigModule.forRoot({
			load: [auth, database, hosts, jwt, roles],
			validationSchema: envValidationSchema,
		}),
		JwtModule.register(jwt()),
		CacheModule.register({
			isGlobal: true,
		}),
		ScheduleModule.forRoot(),
	],
	controllers: [AuthController, DocsController, DeleteController, GetController, PostController, PutController],
	providers: [
		Airtable,
		AppBootup,
		AuthService,
		Authentication,
		Documentation,
		Encryption,
		HostCheckMiddleware,
		Logger,
		Mongo,
		MySQL,
		MSSQL,
		Pagination,
		Postgres,
		Query,
		Response,
		Roles,
		Schema,
		TasksService,
		Webhook,
		WebsocketGateway,
		WebsocketService,
		{
			provide: REDIS_PUB_CLIENT_TOKEN,
			useFactory: createPubSubOnlyRedisClient,
		},
		{
			provide: REDIS_SUB_CLIENT_TOKEN, // A redis client, once subscribed to events, cannot be used for publishing events unfortunately. This is why two are needed
			useFactory: createPubSubOnlyRedisClient,
		},
	],
	exports: [
		Airtable,
		AppBootup,
		AuthService,
		Authentication,
		Documentation,
		Encryption,
		HostCheckMiddleware,
		Logger,
		Mongo,
		MySQL,
		MSSQL,
		Pagination,
		Postgres,
		Query,
		Response,
		Roles,
		Schema,
		Webhook,
		WebsocketService,
		WebsocketGateway,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(HostCheckMiddleware).forRoutes('*')
	}
}
