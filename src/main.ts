import 'dotenv/config'
import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'

import { APP_BOOT_CONTEXT } from './app.constants'
import { AppModule } from './app.module'
import { Logger } from './helpers/Logger'
import { RequestPathLoggerMiddleware } from './middleware/request-path-logger.middleware';
import { WelcomeModule } from './modules/welcome/welcome.module'

async function bootstrap() {
	const logger = new Logger()
	logger.status()
	let app

	if (!process.env.DATABASE_URI) {
		app = await NestFactory.create<NestExpressApplication>(WelcomeModule)
		app.useStaticAssets(join(__dirname, '..', 'public'))
		app.setBaseViewsDir(join(__dirname, '..', 'views'))
		app.setViewEngine('hbs')
	} else {
		app = await NestFactory.create<NestExpressApplication>(AppModule)
	}

	app.enableCors({
		origin: process.env.BASE_URL_APP || true,
		credentials: true,
	})
	await app.listen(process.env.PORT)

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
		}),
	)

	app.use(new RequestPathLoggerMiddleware().use);

	let url = await app.getUrl()
	url = url.replace('[::1]', 'localhost')
	logger.log(`Application is running on: ${url}`, APP_BOOT_CONTEXT)

	if (process.env.TZ) {
		logger.log(`Timezone is set to: ${process.env.TZ}. Current time: ${new Date()}`, APP_BOOT_CONTEXT)
	}
}
bootstrap()
