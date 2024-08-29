
export default {
    "api_key": {
        "table": "users",
        "column": "api_key",
        "where": [{
            "column": "deleted_at",
            "value": null
        }]
    },
    "jwt_token": {
        "table": "users",
        "columns": [{"email": "email", "password": "password"}],
        "where": [{
            "column": "deleted_at",
            "value": null
        }]
    }   
}