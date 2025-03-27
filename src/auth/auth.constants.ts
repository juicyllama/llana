export const JWT = 'jwt'

export const DEFAULT_ACCESS_TOKEN_EXPIRY_MINUTES = 60 // A commonly recommended expiration time for an access token is short, ranging from 15 minutes to 1 hour, to minimize the window of vulnerability if it gets compromised.
export const DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS = 14 // Refresh tokens, which are used to obtain new access tokens without requiring user re-authentication, have a longer lifespan, often set between 14 days to 6 months, depending on the level of security required. Long-lived refresh tokens increase convenience but require careful handling to mitigate security risks.
export const ACCESS_TOKEN_COOKIE_NAME = 'accessToken'
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken'
