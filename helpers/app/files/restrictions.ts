enum RestrictionType {
    APIKEY = "APIKEY",
    JWT = "JWT"
}

enum RestrictionLocation {
    HEADER = "HEADER",
    QUERY = "QUERY",
    BODY = "BODY"
}

export default [{
    "type": RestrictionType.APIKEY,
    "location": RestrictionLocation.HEADER,
    "name": "X-API-KEY",
    "include": ["*"],
    "exclude": ["auth/*"]
},{
    "type": RestrictionType.JWT,
    "include": ["*"],
    "exclude": ["auth/*"]
}]