import { registerAs } from '@nestjs/config';
import { Restriction, RestrictionLocation, RestrictionType } from '../types/restrictions.types'

export default registerAs('restrictions', () => (<Restriction[]>[{
    type: RestrictionType.APIKEY,
    location: RestrictionLocation.HEADER,
    name: "x-api-key",
    include: [],
    exclude: ["auth/*"]
},{
    type: RestrictionType.JWT,
    include: [],
    exclude: ["auth/*"]
}]))