#!/bin/bash

# Script to be run in the dev code tree to bring the current development 
# code tree to being exactly the same as the current production code tree.

# Uncomment the following 2 lines only when running in a new clone of the code tree.
# git remote add prod https://github.com/davidgma/food-log-prod.git
# git remote -v


git fetch prod main
git reset --hard prod/main
echo "food-log-dev.freshfood.rocks" > public/CNAME
git add public/CNAME
git add 1-reset-dev-to-prod.sh
git commit -m "Set CNAME to dev domain. Keep reset-to-prod script"
git push --force origin main
