import { Logger } from '../../helpers/Logger'

export class RedisMockWithPubSub {
	private callbacks = []
	logger = new Logger()
	status = 'ready'

	async publish(channel: string, message: string) {
		this.logger.debug(`[RedisMockWithPubSub] Publishing, message: ${message}`)
		this.callbacks.forEach(callback => callback(channel, message))
	}

	subscribe() {}

	on(event: string, callback: (channel, message) => void) {
		this.logger.debug(`[RedisMockWithPubSub] Subscribing`)
		this.callbacks.push(callback)
	}

	unsubscribe() {}

	disconnect() {}
}
