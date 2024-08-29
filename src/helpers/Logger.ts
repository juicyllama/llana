
import { Injectable, Scope, ConsoleLogger } from '@nestjs/common';

export const context = 'Llana'

@Injectable({ scope: Scope.TRANSIENT })
export class Logger extends ConsoleLogger {}

