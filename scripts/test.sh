#!/bin/sh

## Objective is to run over each data source and run the tests, allowing us to fully test every datasource each time we run the tests

## Create array of data sources (string[])
data_sources="mysql postgresql mongodb mssql"

errored=false

wait_for_database() {
    local host=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "Waiting for database at $host:$port..."
    while [ $attempt -le $max_attempts ]; do
        if nc -z $host $port >/dev/null 2>&1; then
            echo "Database is available after $attempt attempts"
            sleep 5
            return 0
        fi
        echo "Attempt $attempt/$max_attempts: Database not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    echo "Database failed to become available after $max_attempts attempts"
    return 1
}

## Loop over each data source and run the tests
for data_source in $data_sources
do
    echo "Running tests for $data_source"

    if [ "$errored" = true ]; then
        echo "Skipping $data_source as already errored"
        continue
    fi

    ## Run the tests via npm with proper database connection string
    case $data_source in
        mysql)
            if ! wait_for_database localhost 3306; then
                echo "MySQL failed to become ready"
                errored=true
                continue
            fi
            if ! DATABASE_URI="mysql://user:pass@localhost:3306/llana?connectionLimit=10" npm run test:current; then
                echo "Tests failed for mysql"
                errored=true
            fi
            ;;
        postgresql)
            if ! wait_for_database localhost 5432; then
                echo "PostgreSQL failed to become ready"
                errored=true
                continue
            fi
            if ! DATABASE_URI="postgresql://user:pass@localhost:5432/llana" npm run test:current; then
                echo "Tests failed for postgresql"
                errored=true
            fi
            ;;
        mongodb)
            if ! wait_for_database localhost 27017; then
                echo "MongoDB failed to become ready"
                errored=true
                continue
            fi
            if ! DATABASE_URI="mongodb://user:pass@localhost:27017/llana" npm run test:current; then
                echo "Tests failed for mongodb"
                errored=true
            fi
            ;;
        mssql)
            if ! wait_for_database localhost 1433; then
                echo "MSSQL failed to become ready"
                errored=true
                continue
            fi
            if ! DATABASE_URI="mssql://sa:S7!0nGpAw0rD@localhost:1433/llana" npm run test:current; then
                echo "Tests failed for mssql"
                errored=true
            fi
            ;;
    esac
done

if [ "$errored" = true ]; then
    echo "Tests failed"
    exit 1
else
    echo "Tests passed"
    exit 0
fi
