import 'dotenv/config'
import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { APP_BOOT_CONTEXT } from './app.constants'
import { AppModule } from './app.module'
import { Logger } from './helpers/Logger'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	app.enableCors()
	await app.listen(process.env.PORT ?? 3000)

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
		}),
	)

	const logger = new Logger()
	logger.status()

	let url = await app.getUrl()
	url = url.replace('[::1]', 'localhost')
	logger.log(`Application is running on: ${url}`, APP_BOOT_CONTEXT)

	if (process.env.TZ) {
		logger.log(`Timezone is set to: ${process.env.TZ}. Current time: ${new Date()}`, APP_BOOT_CONTEXT)
	}
}
bootstrap()
