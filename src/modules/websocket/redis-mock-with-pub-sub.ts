import { Logger } from '../../helpers/Logger'

export class RedisMockWithPubSub {
	private callbacks = []
	logger = new Logger()
	status = 'ready'

	async publish(channel: string, message: string) {
		this.logger.debug(`[RedisMockWithPubSub] Publishing, message: ${message} to all channels`)
		this.callbacks.forEach(callback => {
			try {
				callback(channel, message)
			} catch (error) {
				this.logger.error(`[RedisMockWithPubSub] Error in callback: ${error}`)
			}
		})
	}

	subscribe() {}

	on(event: string, callback: (channel, message) => void) {
		this.logger.debug(`[RedisMockWithPubSub] Subscribing to all events`)
		this.callbacks.push(callback)
	}

	unsubscribe() {}

	disconnect() {}
}
