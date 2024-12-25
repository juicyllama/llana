#!/bin/sh

## Objective is to run over each data source and run the tests, allowing us to fully test every datasource each time we run the tests

## Create array of data sources (string[])
data_sources="mysql postgresql mongodb mssql oracle"

errored=false

## Loop over each data source and run the tests
for data_source in $data_sources
do
    echo "Running tests for $data_source"

    if [ "$errored" = true ]; then
        echo "Skipping $data_source as already errored"
        continue
    fi

    ## Run the tests via npm eg. npm run test:mysql
    if ! npm run test:$data_source; then
        ## If the tests fail, print an error message
        echo "Tests failed for $data_source"

        errored=true
    fi

done

if [ "$errored" = true ]; then
    echo "Tests failed"
    exit 1
else
    echo "Tests passed"
    exit 0
fi
