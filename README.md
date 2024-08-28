<div align="center">
  <a href="https://juicyllama.com/" target="_blank">
    <img src="https://juicyllama.com/assets/images/icon.png" width="100" alt="JuicyLlama Logo" />
  </a>

Visit [JuicyLlama > Tools > Llana](https://juicyllama.com/tools/llana) for full installation instructions, documentation and community. 

## Installation 

npm i -g @juicyllama/llana

## Commands


### Setup



## Configuration

### Authentication 

We provide 3 special extra endpoints which are not generated based on your database schema. 

* `/auth/login`
* `/auth/logout`
* `/auth/reset`

By defualt, these expect a table named `users` with the fields `email` and `password`, you can override these settings in in the auth.json file.

### Restrictions

Out of the box we provide an two restrictions in the restrictions.json which requires users to either authenticate (via the `/auth/login` endpoint) and pass a JWT token to all other endpoints or by providing an API Key. 

By default the API Key expect a table named `users` with the field `api_key`, you can override these settings in in the auth.json file.





</div>