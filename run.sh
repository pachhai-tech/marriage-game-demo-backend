#!/bin/bash

# Ensure we have at least one argument passed
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <task>"
    exit 1
fi

TASK="$1"

case $TASK in
    deploy)
        firebase deploy --only functions
        ;;
    emulate-init)
        firebase init emulators
        ;;
    emulate)
        firebase emulators:start
        ;;
    *)
        echo "Invalid task. Available tasks are: deploy, emulate"
        exit 1
        ;;
esac
