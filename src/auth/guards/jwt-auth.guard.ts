import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

import { JWT } from '../auth.constants'

@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT) {}
