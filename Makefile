# Makefile for tabby-mcp project
# Docker-only build system

# Variables
PROJECT_NAME = tabby-mcp
BUILD_DIR = build

# Default target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  build-dist              - Build chỉ dist folder"
	@echo "  build-dist-with-deps    - Build dist + node_modules"
	@echo "  help                    - Show this help"

# Build dist only
.PHONY: build-dist
build-dist:
	@echo "Building dist only..."
	@rm -rf $(BUILD_DIR)
	@mkdir -p $(BUILD_DIR)
	docker build --target builder-mcp -t $(PROJECT_NAME)-dist .
	@# Create temporary container and copy files
	@echo "Copying files from container..."
	@CONTAINER_ID=$$(docker create $(PROJECT_NAME)-dist) && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/dist $(BUILD_DIR)/ && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/README.md $(BUILD_DIR)/ && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/package.json $(BUILD_DIR)/ && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/LICENSE $(BUILD_DIR)/ && \
	docker rm $$CONTAINER_ID
	@echo "✅ Build dist completed"

# Build dist with node_modules
.PHONY: build-dist-with-deps
build-dist-with-deps:
	@echo "Building dist with node_modules..."
	@rm -rf $(BUILD_DIR) node_modules/
	@mkdir -p $(BUILD_DIR)
	docker build -t $(PROJECT_NAME) .
	@# Create temporary container and copy files
	@echo "Copying files from container..."
	@CONTAINER_ID=$$(docker create $(PROJECT_NAME)) && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/dist $(BUILD_DIR)/ && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/README.md $(BUILD_DIR)/ && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/package.json $(BUILD_DIR)/ && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/LICENSE $(BUILD_DIR)/ && \
	docker cp $$CONTAINER_ID:/tabby/tabby-mcp/node_modules ./ && \
	docker rm $$CONTAINER_ID
	@echo "✅ Build dist with dependencies completed" 