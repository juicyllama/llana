export interface Restriction {
    type: RestrictionType,
    location: RestrictionLocation,
    name: string,
    include: string[],
    exclude: string[],
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