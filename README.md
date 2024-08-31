<div align="center">
  <a href="https://juicyllama.com/" target="_blank">
    <img src="https://juicyllama.com/assets/images/icon.png" width="100" alt="JuicyLlama Logo" />
  </a>

Visit [JuicyLlama > Tools > Llana](https://juicyllama.com/tools/llana) for full installation instructions, documentation and community. 

## Database Support

We currently support the following databases:

- [ ] [ORACLE](https://expressjs.com/en/guide/database-integration.html#oracle) (Help Wanted)
- [ ] [MYSQL](https://expressjs.com/en/guide/database-integration.html#mysql) (In Progress)
- [ ] MSSQL (Help Wanted)
- [ ] [POSTGRES](https://expressjs.com/en/guide/database-integration.html#postgresql) (Help Wanted)
- [ ] [MONGODB](https://expressjs.com/en/guide/database-integration.html#mongodb) (Help Wanted)
- [ ] [REDIS](https://expressjs.com/en/guide/database-integration.html#redis) (Help Wanted)
- [ ] SNOWFLAKE (Help Wanted)
- [ ] [ELASTICSEARCH](https://expressjs.com/en/guide/database-integration.html#elasticsearch) (Help Wanted)
- [ ] [SQLITE](https://expressjs.com/en/guide/database-integration.html#sqlite) (Help Wanted)
- [ ] [CASSANDRA](https://expressjs.com/en/guide/database-integration.html#cassandra) (Help Wanted)
- [ ] MARIADB (Help Wanted)

## TODO:

- [ ] integrate JWT token support
- [ ] setup auth login endpoint
- [ ] finish endpoint support for mysql 
- [ ] add full testing
- [ ] move docs to JL Website
- [ ] containerize and publish to docker
- [ ] use on first external client project
- [ ] Adding more database integrations (postgres, etc)
- [ ] Build integrations with workflow automation tooling (n8n, zapier, make, etc)
- [ ] Publish on Daily.dev, ProductHunt, etc 
- [ ] Scope Llana cloud option for non-technical users


## Installation 

```bash
npm i -g @juicyllama/llana
npm install
```

## Configutation

### Database

Replace the database connection string `DATABASE_URI` in the `.env` file.

### Authentication 

We provide a special extra endpoint, the only one not generated based on your database schema. 

* `/auth/login`

This endpoint will take the users login credentials and return back a JWT token, which can be used as authentication for other endpoints (see Restrictions below).

By defualt, this expects a table named `users` with the fields `email` and `password`, you can override these settings in in the `src/config/auth.config.ts` file.

### Restrictions

Out of the box we provide an two example restrictions in the `src/config/restrictions.config.ts` which requires users to either authenticate (via the `/auth/login` endpoint) and pass the JWT token to all other endpoints or by providing an API Key. 

By default the API Key expect a table named `users` with the field `api_key`, you can override these settings in in the `src/config/auth.config.ts` file.

You can update `src/config/restrictions.config.ts` to enforce different types of restrictions on data access.

By default restrictions will apply to all endpoints, you can add exclusions to the config. There is an option to add inclusions for more granular inclusion/exclusion support.

</div>

## Building Requests

### Fields

You can specify which fields you would like to return, defualts to `*`

Example `?fields=id,name,content.id`

Note, if you pass deep fields (table.column) then you must pass the table as a relation also.

### Relations

You can fetch deeper content by passing relations, assuming their is a forign key connection it will return the deep result.

Example `?relations=content`

### Pagination 

Pass page into requests to load a specific page result, in the `/list` response you will find the following:

```
"pagination": {
        "total": number, //total results in this page
        "page": {
            "current": string, //the page ref for the current page
            "prev": string, //the page ref for the previous page (if applicable)
            "next": string, //the page ref for the next page (if applicable)
            "first": string,
            "last": string
        }
    },
```

- page (either `next` or `prev` from existing result - helps with pagination)

### Filtering

format is column[operator]=value with operator being from the enum WhereOperator 
      
Example: `?id=1&first_name[equals]=John&age[gte]=21&content.deleted_at[null]`

### Sorting

format is sort={column}.{direction},column.{direction}

`?sort=name.asc,id.desc`

## Endpoints

We have implemented CRUD+ principles

- TODO: Create (POST)
  - TODO: Single `*/`
  - TODO: Bulk `*/bulk`
- Read (GET)
  - Find By Id `*/:id`
  - FindOne `*/`
  - Multiple `*/list`
  - TODO: Charting `*/chart`
- TODO: Update (PUT)
  - TODO: Single `*/:id`
  - TODO: Bulk `*/bulk`
- TODO: Upsert (PATCH)
  - TODO: Single `*/:id`
  - TODO: Bulk `*/bulk`
- TODO: Delete (DELETE)
  - TODO: Single `*/:id`
  - TODO: Bulk `*/bulk`


### Read One (By ID)

Endpoint: `*/:id`

Example Request:

```
GET `/users/1?fields=role,id,content.id&relations=content`
```

Example Response: 

```
{"role":"ADMIN","id":1,"content":[{"id":3},{"id":2},{"id":1}]}
```

### Read One

Endpoint: `*/`

Example Request:

```
GET `/users/1?fields=role,id,content.id&relations=content`
```

Example Response: 

```
{"role":"ADMIN","id":1,"content":[{"id":3},{"id":2},{"id":1}]}
```

### Read All

Endpoint: `*/list`

```
GET `/users/list`
```

Response Schema: 

```
{
    "limit": number, //records returned for this page
    "offset": number, //the current offset value
    "total": number, //total records for all pages
    "pagination": {}, //see pagination
    "data": [...records]
}
```

Example Response: 

```
{
    "limit": 20,
    "offset": 0,
    "total": 1,
    "pagination": {
        "total": 1,
        "page": {
            "current": "eyJsaW1pdCI6MjAsIm9mZnNldCI6MH0=",
            "prev": null,
            "next": null,
            "first": "eyJsaW1pdCI6MjAsIm9mZnNldCI6MH0=",
            "last": "eyJsaW1pdCI6MjAsIm9mZnNldCI6MH0="
        }
    },
    "data": [
        {
            "id": 1,
            "email": "email@email.com",
            "password": "**********",
            "role": "ADMIN",
            "first_name": "Jon",
            "last_name": "Doe",
        }
    ]
}
```