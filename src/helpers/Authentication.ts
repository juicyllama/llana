import { Injectable, Req } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { context, Logger } from "./Logger";
import { Restriction, RestrictionLocation, RestrictionType } from "src/types/restrictions.types";
import { AuthAPIKey } from "src/types/auth.types";
import { Query } from "./Query";
import { WhereOperator } from "../types/database.types";
import { Schema } from "./Schema";

@Injectable()
export class Authentication {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
        private readonly query: Query,
        private readonly schema: Schema,
	) {
		this.logger.setContext(context)
	}

    /**
     * Create entity schema from database schema
     * @param schema
     */

    async auth(@Req() req): Promise<{valid: boolean, message?: string}> {

        const restrictions = this.configService.get<Restriction[]>('restrictions')

        if(!restrictions){
            return {
                valid: true
            }
        }

        let auth_passed: {valid: boolean, message?: string} = {
            valid: false,
            message: 'Unathorized'
        }

        for(const restriction of restrictions){
            if(auth_passed.valid) continue

            if(!restriction.type){
                auth_passed = {
                    valid: false,
                    message: 'System configuration error: Restriction type required'
                }
                continue
            }

            //Is the restriction required on the current route?
            let check_required = true

            if(restriction.routes?.exclude){
                for(const exclude of restriction.routes.exclude){
                    if(req.originalUrl.includes(exclude)){
                        check_required = false
                    }

                    if(exclude.includes('*')){
                        if(req.originalUrl.includes(exclude.split('*')[0])){
                            check_required = false
                        }
                    }

                    if(exclude === '*'){
                        check_required = false
                    }
                }
            }

            if(restriction.routes?.include){
                for(const include of restriction.routes.include){
                    if(req.originalUrl.includes(include)){
                        check_required = true
                    }

                    if(include.includes('*')){
                        if(req.originalUrl.includes(include.split('*')[0])){
                            check_required = true
                        }
                    }

                    if(include === '*'){
                        check_required = true
                    }
                }
            }

            if(!check_required) continue

            switch(restriction.type){
                case RestrictionType.APIKEY:

                    if(!restriction.name){
                        auth_passed = {
                            valid: false,
                            message: 'System configuration error: API key name required'
                        }
                        continue
                    }

                    if(!restriction.location){
                        auth_passed = {
                            valid: false,
                            message: 'System configuration error: API key location required'
                        }
                        continue
                    }
                    
                    let req_api_key

                    switch(restriction.location){
                        case RestrictionLocation.HEADER:
                            if(!req.headers[restriction.name]){
                                auth_passed = {valid: false, message: `API key header ${restriction.name} required`}
                                continue
                            }
                            req_api_key = req.headers[restriction.name]
                            break
        
                        case RestrictionLocation.QUERY:
                            if(!req.query[restriction.name]){
                                auth_passed = {valid: false, message: `API key query ${restriction.name} required`}
                                continue
                            }
                            req_api_key = req.query[restriction.name]
                            break
        
                        case RestrictionLocation.BODY:
                            if(!req.body[restriction.name]){
                                auth_passed = {valid: false, message: `API key body ${restriction.name} required`}
                                continue
                            }
                            req_api_key = req.body[restriction.name]
                            break
                    }

                    if(!req_api_key){
                        auth_passed = {
                            valid: false,
                            message: 'API key required'
                        }
                        continue
                    }

                    const api_key_config = this.configService.get<AuthAPIKey>('auth.api_key')
                            
                    if(!api_key_config || !api_key_config.table){
                        auth_passed = {
                            valid: false,
                            message: 'System configuration error: API Key lookup table not found'
                        }
                        continue
                    } 
                    
                    if(!api_key_config.column){
                        auth_passed = {
                            valid: false,
                            message: 'System configuration error: API Key lookup column not found'
                        }
                        continue
                    }

                    const schema = await this.schema.getSchema(api_key_config.table)
                    const result = await this.query.findOne({
                        schema,
                        where: [{
                            column: api_key_config.column,
                            operator: WhereOperator.equals,
                            value: req_api_key
                        }]

                    })

                    //key does not match - return unauthorized immediately
                    if(!result || !result[api_key_config.column] || result[api_key_config.column] !== req_api_key){
                        return { valid: false, message: 'Unathorized' }
                    }

                    auth_passed = {
                        valid: true
                    }

                    break

                case RestrictionType.JWT:
                    
                    const jwt_token = req.headers['authorization']?.split(' ')[1]

                    if(!jwt_token) {
                        auth_passed = {
                            valid: false,
                            message: 'JWT token required'
                        }
                        continue
                    }

                    this.logger.error(`[Authentication][auth] JWT authentication not implemented`, {jwt_token})

                    auth_passed = {
                        valid: false,
                        message: 'JWT authentication not implemented'
                    }

                    //TODO: Implement JWT authentication

                    continue   
            
            }

            
        }

        return auth_passed
		
	}

  
}