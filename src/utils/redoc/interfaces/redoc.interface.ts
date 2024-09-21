export interface RedocOptions {
	/** Location of the OpenApi json file */
	docUrl: string
	/** Web site title (e.g: ReDoc documentation) */
	title?: string
	/** Web site favicon URL */
	favicon?: string
	/** Logo Options */
	logo?: LogoOptions
	/** Theme options */
	theme?: any
	/** If set, the spec is considered untrusted and all HTML/markdown is sanitized to prevent XSS, by default is false */
	untrustedSpec?: boolean
	/** If set, warnings are not rendered at the top of documentation (they are still logged to the console) */
	supressWarnings?: boolean
	/** If set, the protocol and hostname won't be shown in the operation definition */
	hideHostname?: boolean
	/** Specify which responses to expand by default by response codes,
	 * values should be passed as comma-separated list without spaces
	 * (e.g: 200, 201, "all")
	 */
	expandResponses?: string
	/** If set, show required properties first ordered in the same order as in required array */
	requiredPropsFirst?: boolean
	/** If set, propeties will be sorted alphabetically */
	sortPropsAlphabetically?: boolean
	/** If set the fields starting with "x-" will be shown, can be a boolean or a string with names of extensions to display */
	showExtensions?: boolean | string
	/** If set, redoc won't inject authentication section automatically */
	noAutoAuth?: boolean
	/** If set, path link and HTTP verb will be shown in the middle panel instead of the right one */
	pathInMiddlePanel?: boolean
	/** If set, loading spinner animation won't be shown */
	hideLoading?: boolean
	/** If set, a native scrollbar will be used instead of perfect-scroll, this can improve performance of the frontend for big specs */
	nativeScrollbars?: boolean
	/** This will hide the "Download spec" button, it only hides the button */
	hideDownloadButton?: boolean
	/** If set, the search bar will be disabled */
	disableSearch?: boolean
	/** Shows only required fileds in request samples */
	onlyRequiredInSamples?: boolean
	/** Name of the swagger json spec file */
	docName?: string
	/** Authentication options */
	auth?: {
		// Default value is false
		enabled: boolean
		// If auth is enabled but no user is provided the default value is "admin"
		user: string
		// If auth is enabled but no password is provided the default value is "123"
		password: string
	}

	/** Vendor extensions */

	/** If set, group tags in categories in the side menu. Tags not added to a group will not be displayed. */
	tagGroups?: TagGroupOptions[]
}

export interface LogoOptions {
	/** The URL pointing to the spec logo, must be in the format of a URL and an absolute URL */
	url?: string
	/** Background color to be used, must be RGB color in hexadecimal format (e.g: #008080) */
	backgroundColor?: string
	/** Alt tag for logo */
	altText?: string
	/** href tag for logo, it defaults to the one used in your API spec */
	href?: string
}

export interface TagGroupOptions {
	name: string
	tags: string[]
}
