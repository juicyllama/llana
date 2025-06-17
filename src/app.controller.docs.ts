import { Controller, Get, Res, Header } from '@nestjs/common'
import * as fs from 'fs'

import { version } from '../package.json'
import { Documentation } from './helpers/Documentation'
import { RedocOptions } from './utils/redoc/interfaces/redoc.interface'
import { RedocModule } from './utils/redoc/redoc'

@Controller()
export class DocsController {
	constructor(private readonly documentation: Documentation) {}

	@Header('X-Robots-Tag', 'noindex, nofollow')
	@Get('/')
	async index(@Res() res) {
		if (this.documentation.skipDocs()) {
			return res.json({ version })
		} else {
			const redoc: RedocOptions = {
				title: process.env.DOCS_TITLE ?? 'API Documentation',
				docUrl: '/openapi.json',
			}

			return res.send(await RedocModule.setup(redoc))
		}
	}

	@Header('X-Robots-Tag', 'noindex, nofollow')
	@Get('/openapi.json')
	openapi(@Res() res): string {
		if (this.documentation.skipDocs()) {
			return res.json({ version })
		} else {
			return res.json(JSON.parse(fs.readFileSync('openapi.json', 'utf8')))
		}
	}

	@Header('X-Robots-Tag', 'noindex, nofollow')
	@Get('/favicon.ico')
	fav(@Res() res): string {
		return res.sendFile('favicon.ico', { root: 'public' })
	}
}
