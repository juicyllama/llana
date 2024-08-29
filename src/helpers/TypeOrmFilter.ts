import { Logger } from '@nestjs/common'
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common'
import { TypeORMError } from 'typeorm'

@Catch(TypeORMError)
export class TypeOrmFilter implements ExceptionFilter {
	catch(exception: TypeORMError, host: ArgumentsHost) {
		const response = host.switchToHttp().getResponse()
		const message: string = (exception as TypeORMError).message
		const code: string = (exception as any).code
		const details: string = (exception as any).sql

		const logger = new Logger()

		switch (code) {
			default:
				logger.debug(`[LLANA][${code}] ${message} (${details})`, exception)
		}

		response.status(500).json({
			status: 500,
			error: 'Database Error',
		})
	}
}
