import { CacheModule } from '@nestjs/cache-manager'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { ScheduleModule } from '@nestjs/schedule'

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
import { Websocket } from './helpers/Websocket'
import { HostCheckMiddleware } from './middleware/HostCheck'
import { WebsocketModule } from './modules/websocket/websocket.module'

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
		WebsocketModule,
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
		Websocket,
		Webhook,
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
		Websocket,
		Webhook,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(HostCheckMiddleware).forRoutes('*')
	}
}
