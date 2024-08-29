<div align="center">
  <a href="https://juicyllama.com/" target="_blank">
    <img src="https://juicyllama.com/assets/images/icon.png" width="100" alt="JuicyLlama Logo" />
  </a>

Visit [JuicyLlama > Tools > Llana](https://juicyllama.com/tools/llana) for full installation instructions, documentation and community. 

TODO: move docs to JL Website

## Installation 

```bash
npm i -g @juicyllama/llana
npm install
```

## Configutation

### Database

Replace the database connection string `DATABASE_URI` in the `.env` file.

### Authentication 

We provide 3 special extra endpoints which are not generated based on your database schema. 

* `/auth/login`
* `/auth/logout`
* `/auth/reset`

By defualt, these expect a table named `users` with the fields `email` and `password`, you can override these settings in in the `src/config/auth.config.ts` file.

### Restrictions

Out of the box we provide an two restrictions in the `src/config/restrictions.config.ts` which requires users to either authenticate (via the `/auth/login` endpoint) and pass a JWT token to all other endpoints or by providing an API Key. 

By default the API Key expect a table named `users` with the field `api_key`, you can override these settings in in the `src/config/auth.config.ts` file.

You can update `src/config/restrictions.config.ts` to enforce different types of restrictions on data access.

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