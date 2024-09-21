import * as handlebars from 'express-handlebars'
import { join } from 'path'

import { RedocOptions } from './interfaces/redoc.interface'

export class RedocModule {
	/**
	 * Setup ReDoc frontend
	 */
	public static async setup(options: RedocOptions): Promise<string> {
		try {
			const hbs = handlebars.create({
				helpers: {
					toJSON: function (object: any) {
						return JSON.stringify(object)
					},
				},
			})
			// spread redoc options
			const { title, favicon, theme, docUrl, ...otherOptions } = options
			// create render object
			const renderData = {
				data: {
					title,
					docUrl,
					favicon,
					options: otherOptions,
					...(theme && {
						theme: {
							...theme,
						},
					}),
				},
			}

			// this is our handlebars file path
			const redocFilePath = join(__dirname, 'views', 'redoc.handlebars')

			// get handlebars rendered HTML
			const redocHTML = await hbs.render(redocFilePath, renderData)

			return redocHTML
		} catch (e) {
			const error = e as Error
			throw error
		}
	}
}
