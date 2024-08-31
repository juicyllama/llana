import { Method } from "./response.types";

export interface Restriction {
    type: RestrictionType,
    location: RestrictionLocation,
    name: string,
    hosts?: string[],
    routes?: {
        include?: string[],
        exclude?: string[],
    }
}

export enum RestrictionType {
    APIKEY = "APIKEY",
    JWT = "JWT"
}

export enum RestrictionLocation {
    HEADER = "HEADER",
    QUERY = "QUERY",
    BODY = "BODY"
}