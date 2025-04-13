#!/bin/bash

# Set variables
SOURCE_DIR="$PWD/build"
TARGET_DIR="$HOME/Library/Application Support/tabby/plugins/node_modules/tabby-mcp"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory $SOURCE_DIR does not exist."
    echo "Make sure you've built the project with Docker first."
    exit 1
fi

# Create target directory if it doesn't exist
echo "Creating target directory if needed..."
mkdir -p "$TARGET_DIR"

# Copy files to target location
echo "Copying files to target location..."
cp -R "$SOURCE_DIR"/* "$TARGET_DIR/"

# Check if node_modules exists in the build directory
if [ -d "$SOURCE_DIR/node_modules" ]; then
    echo "Copying node_modules..."
    cp -R "$SOURCE_DIR/node_modules" "$TARGET_DIR/"
fi

# Check if node_modules_export exists in the build directory
if [ -d "$SOURCE_DIR/node_modules_export" ]; then
    echo "Copying node_modules_export to node_modules..."
    mkdir -p "$TARGET_DIR/node_modules"
    cp -R "$SOURCE_DIR/node_modules_export"/* "$TARGET_DIR/node_modules/"
fi

echo "Build and copy completed successfully."
echo "Files installed to: $TARGET_DIR"
