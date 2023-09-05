#!/bin/bash

# Change to your project directory
cd /media/hossam/'New Volume'/Programming/MyProjects/androidFatora

# Add all files to the Git staging area
git add .

# Commit the changes with a commit message
git commit -m "Update project files"

# Get the project branch that i want to push to
git branch -M main

# Push the changes to the remote repository (GitHub)
git push -u origin main
