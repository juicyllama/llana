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


# TODO:

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

## Endpoints

We have implemented CRUD+ principles

- TODO: Create
  - TODO: Single
  - TODO: Bulk
- Read 
  - Single (by primary key)
  - Multiple
  - TODO: Charting
- TODO: Update
  - TODO: Single
  - TODO: Bulk
- TODO: Upsert
  - TODO: Single
  - TODO: Bulk
- TODO: Delete
  - TODO: Single
  - TODO: Bulk


### Read One (By ID)

Endpoint: `*/:id`

Available Query Params: 

- filters
- relations 

Example Request:

```
GET /users/1?fields=role,id,content.id&relations=content
```

Example Response: 

```
{"role":"ADMIN","id":1,"content":[{"id":3},{"id":2},{"id":1}]}
```

### Read All

Endpoint: `*/list`

Available Query Params: 

- filters
- relations 
- limit
- offset
- page (either `next` or `previous` from existing result - helps with pagination)


```
GET /users/list
```

Example Response: 

```

```