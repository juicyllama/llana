import { Injectable, Req } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { context, Logger } from "./Logger";
import { Restriction, RestrictionLocation, RestrictionType } from "src/types/restrictions.types";
import { AuthAPIKey } from "src/types/auth.types";
import { Query } from "./Query";
import { DatabaseType } from "../types/database.types";

@Injectable()
export class Authentication {
	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
        private readonly query: Query,
	) {
		this.logger.setContext(context)
	}

    /**
     * Create entity schema from database schema
     * @param schema
     */

    async auth(@Req() req): Promise<{valid: boolean, message?: string}> {

        const restrictions = this.configService.get<Restriction[]>('restrictions')

        console.log('restrictions', restrictions)

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

            if(restriction.exclude){
                for(const exclude of restriction.exclude){
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

            if(restriction.include){
                for(const include of restriction.include){
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

                    let database_api_key

                    switch (this.configService.get<string>('database.type')) {
                        case DatabaseType.MYSQL:

                            let command = `SELECT ${api_key_config.column} FROM ${api_key_config.table} WHERE ${api_key_config.column} = '${req_api_key}' `
                            if (api_key_config.where?.length) {
                                command += `AND ${api_key_config.where.map(where => `${where.column} ${where.operator} ${where.value ?? ''}`).join(' AND ')}`
                            }

                            let mysql_result 

                            try{
                                mysql_result = await this.query.raw(api_key_config.table, command)
                            }catch(e){
                                auth_passed = { valid: false, message: 'System error: API Key lookup failed' }
                                continue
                            }

                            if (!mysql_result){
                                auth_passed = { valid: false, message: 'System error: API Key lookup failed' }
                                continue
                            } 
                            
                            //Entry not found - return unauthorized immediately
                            if (!mysql_result[0] || !mysql_result[0][api_key_config.column]) {
                                return { valid: false, message: 'Unathorized' }
                            }

                            database_api_key = mysql_result[0][api_key_config.column]
                            break

                        default:
                            this.logger.error(`[Schema][reate] Database type ${this.configService.get<string>('database.type')} not supported`)
                            auth_passed = { valid: false, message: 'System error: Database type not supported' }
                            continue
                    }

                    //key does not match - return unauthorized immediately
                    if(!database_api_key || database_api_key !== req_api_key){
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
                    break     
            
            }

            
        }

        return auth_passed
		
	}

  
}