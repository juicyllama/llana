import 'dotenv/config'
import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'

// import * as basicAuth from 'express-basic-auth'
import { AppModule } from './app.module'
import { Logger } from './helpers/Logger'
import { ValidationPipe } from '@nestjs/common'
import { APP_BOOT_CONTEXT } from './app.constants'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	// app.use(
	// 	['/llana'],
	// 	basicAuth({
	// 		users: { [process.env.CONFIG_AUTH_USERNAME]: process.env.CONFIG_AUTH_PASSWORD },
	// 		challenge: true,
	// 		realm: process.env.CONFIG_AUTH_REALM,
	// 	}),
	// )

	await app.listen(process.env.PORT ?? 3000)

	app.useGlobalPipes(
		new ValidationPipe({
		  transform: true,
		}),
	  );
	  

	const logger = new Logger()
	logger.status()

	let url = await app.getUrl()
	url = url.replace('[::1]', 'localhost')
	logger.log(`Application is running on: ${url}`, APP_BOOT_CONTEXT)
}
bootstrap()
