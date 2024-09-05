## check if .env file exists, if not create it from .env.example

if [ ! -f .env ]; then
    echo "Creating .env file from .env.example"
    cp .env.example .env
fi

## generate a randomly secure JWT_KEY for the .env file if ! exists

export $(grep -v '^#' .env | xargs)

if [ -z "${JWT_KEY}" ]; then
    echo "Generating a secure JWT_KEY"
    JWT_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'));")

    ## Replace the JWT_KEY in the .env file
    sed -i '' 's/JWT_KEY=/JWT_KEY='"${JWT_KEY}"'/' .env
fi

## TODO:  create config files from *.examples.ts if they don't exist

    echo "Checking config files"

if [ ! -f src/config/auth.config.ts ]; then
    cp src/config/auth.config.example.ts src/config/auth.config.ts
fi

if [ ! -f src/config/database.config.ts ]; then
    cp src/config/database.config.example.ts src/config/database.config.ts
fi

if [ ! -f src/config/hosts.config.ts ]; then
    cp src/config/hosts.config.example.ts src/config/hosts.config.ts
fi

if [ ! -f src/config/jwt.config.ts ]; then
    cp src/config/jwt.config.example.ts src/config/jwt.config.ts
fi

if [ ! -f src/config/roles.config.ts ]; then
    cp src/config/roles.config.example.ts src/config/roles.config.ts
fi