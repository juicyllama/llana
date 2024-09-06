import { Controller, Get, Post, Req, Res } from '@nestjs/common'
import * as fs from 'fs'

/**
 * A temporary controller for configuration files which otherwise would be inaccessible via Docker on production.
 *
 * TODO: A Better long-term solution is needed - https://github.com/juicyllama/llana/issues/13 && https://github.com/juicyllama/llana/issues/14
 */

@Controller('/llana')
export class ConfigController {
	constructor() {}

	@Get()
	config(@Req() req, @Res() res): string {
		const authConfig = fs.readFileSync('./src/config/auth.config.ts', 'utf8')
		const roleConfig = fs.readFileSync('./src/config/roles.config.ts', 'utf8')

		return res.send(`
			<h1>Llana Configuration</h1>
			<p>Configuration settings for the Llana API</p>
			
			<form action="/llana" method="post">

				<h3>Authentication</h3>

				<textarea id="auth" name="auth" rows="20" cols="100">${authConfig}</textarea>
			

				<h3>User Roles</h3>

				<textarea id="roles" name="roles" rows="20" cols="100">${roleConfig}</textarea>

				${req.query.success ? '<p style="color:green;">Files saved successfully</p>' : ''}

				<p><button type="submit">Save Files</button></p>
			</form>`)
	}

	@Post()
	configPost(@Req() req, @Res() res): string {
		fs.writeFileSync('./src/config/auth.config.ts', req.body.auth)
		fs.writeFileSync('./src/config/roles.config.ts', req.body.roles)
		return res.redirect('/llana?success=true')
	}
}
