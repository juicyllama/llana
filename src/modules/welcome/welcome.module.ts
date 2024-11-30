import { Module } from '@nestjs/common'
import { WelcomeController } from './welcome.controller'

@Module({
	controllers: [ WelcomeController ],
})

export class WelcomeModule {}

