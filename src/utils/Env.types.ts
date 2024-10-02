export enum Environment {
	production = 'production',
	sandbox = 'sandbox',
	development = 'development',
	test = 'test',
}

export function fromStringToEnv(env = process.env.NODE_ENV): Environment {
	switch (env) {
		case 'production':
			return Environment.production
		case 'sandbox':
			return Environment.sandbox
		case 'development':
			return Environment.development
		case 'test':
			return Environment.test
		default:
			return Environment.production
	}
}
