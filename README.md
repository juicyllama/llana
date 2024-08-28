<div align="center">
  <a href="https://juicyllama.com/" target="_blank">
    <img src="https://juicyllama.com/assets/images/icon.png" width="100" alt="JuicyLlama Logo" />
  </a>

Visit [JuicyLlama > Tools > Llana](https://juicyllama.com/tools/llana) for full installation instructions, documentation and community. 

## Installation 

```bash
npm i -g @juicyllama/llana
```

## Setup Commands

### Boot

The boot command runs after npm install automatically and makes sure you have the relevent system packages to operate the CLI.

You should not need to run this but if the boot fails, you can fix the issue and re-run the boot with the following command:

```bash
llana boot
``` 

### Install

You should navigate into the directory you would like to install the API application, for example a new blank git repository or a folder inside a monorepo and run the install command.

```bash
llana install
``` 

The install will deplpy the application files along with take your database credentials.

Llana only needs read DB access, we will not be writing anything into your database.


## Configutation

### Authentication 

We provide 3 special extra endpoints which are not generated based on your database schema. 

* `/auth/login`
* `/auth/logout`
* `/auth/reset`

By defualt, these expect a table named `users` with the fields `email` and `password`, you can override these settings in in the `/config/auth.ts` file.

### Restrictions

Out of the box we provide an two restrictions in the `/config/restrictions.ts` which requires users to either authenticate (via the `/auth/login` endpoint) and pass a JWT token to all other endpoints or by providing an API Key. 

By default the API Key expect a table named `users` with the field `api_key`, you can override these settings in in the `/config/auth.ts` file.

You can update `/config/restrictions.ts` to enforce different types of restrictions on data access.

</div>