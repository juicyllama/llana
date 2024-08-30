import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import 'dotenv/config'
import { Logger, context } from './helpers/Logger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT);

  const logger = new Logger()
  logger.setContext(context)

  let url = await app.getUrl();
  url = url.replace('[::1]', 'localhost');
  logger.log(`Application is running on: ${url}`);
}
bootstrap();
