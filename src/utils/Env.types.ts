export enum Enviroment {
	production = 'production',
	sandbox = 'sandbox',
	development = 'development',
	test = 'test',
}

export function fromStringToEnv(env = process.env.NODE_ENV): Enviroment {
	switch (env) {
		case 'production':
			return Enviroment.production
		case 'sandbox':
			return Enviroment.sandbox
		case 'development':
			return Enviroment.development
		case 'test':
			return Enviroment.test
		default:
			return Enviroment.development
	}
}
