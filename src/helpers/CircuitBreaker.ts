import { Injectable } from '@nestjs/common'
import { Logger } from './Logger'

export enum CircuitState {
    CLOSED, // Normal operation, requests allowed
    OPEN,   // Failing, requests blocked
    HALF_OPEN // Testing if system is healthy again
}

@Injectable()
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED
    private failureCount: number = 0
    private lastFailureTime: number = 0
    private readonly failureThreshold: number = 5
    private readonly resetTimeout: number = 30000 // 30 seconds

    constructor(private readonly logger: Logger) {}

    public isAllowed(): boolean {
        if (this.state === CircuitState.CLOSED) {
            return true
        }
        
        if (this.state === CircuitState.OPEN) {
            const now = Date.now()
            if (now - this.lastFailureTime > this.resetTimeout) {
                this.state = CircuitState.HALF_OPEN
                this.logger.log('Circuit changed from OPEN to HALF_OPEN')
                return true
            }
            return false
        }
        
        return true
    }

    public reportSuccess(): void {
        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.CLOSED
            this.failureCount = 0
            this.logger.log('Circuit changed from HALF_OPEN to CLOSED')
        }
    }

    public reportFailure(): void {
        this.lastFailureTime = Date.now()
        this.failureCount++
        
        if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
            this.state = CircuitState.OPEN
            this.logger.log(`Circuit changed to OPEN after ${this.failureCount} failures`)
        }
    }
}
