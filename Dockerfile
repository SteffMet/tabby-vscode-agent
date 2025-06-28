# === Stage 1: Clone repo ===
FROM alpine/git AS git-clone

WORKDIR /app
RUN git clone https://github.com/Eugeny/tabby.git .

# === Stage 2: Build tabby ===
FROM node:22-slim AS builder-tabby

WORKDIR /tabby
COPY --from=git-clone /app .

# Install required dependencies for native modules
RUN apt-get update && apt-get install -y \
    libfontconfig1-dev \
    git \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install project dependencies
RUN cd app && yarn && cd .. && yarn

# Build typings and full application
RUN yarn run build:typings

# === Stage 3: Build tabby-mcp ===
FROM node:22-slim AS builder-mcp

# Create working directory
WORKDIR /tabby-mcp

# Copy only necessary tabby dependencies (thay vì copy toàn bộ /tabby)
COPY --from=builder-tabby /tabby/tabby-core ./temp-tabby/tabby-core
COPY --from=builder-tabby /tabby/tabby-settings ./temp-tabby/tabby-settings
COPY --from=builder-tabby /tabby/tabby-terminal ./temp-tabby/tabby-terminal

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the project
RUN npm run build

# === Stage 4: Production image ===
FROM node:22-slim AS production

WORKDIR /tabby-mcp

# Copy built dist folder
COPY --from=builder-mcp /tabby-mcp/dist ./dist

# Copy base node_modules
COPY --from=builder-mcp /tabby-mcp/node_modules ./node_modules

# Copy tabby dependencies to correct locations
COPY --from=builder-mcp /tabby-mcp/temp-tabby/tabby-core ./node_modules/tabby-core
COPY --from=builder-mcp /tabby-mcp/temp-tabby/tabby-settings ./node_modules/tabby-settings
COPY --from=builder-mcp /tabby-mcp/temp-tabby/tabby-terminal ./node_modules/tabby-terminal

# Copy metadata files
COPY README.md package.json LICENSE ./

# Create volumes for output
VOLUME ["/output", "/node_modules_export"]

# Copy files to volumes when container starts
CMD ["sh", "-c", "cp -r ./dist/ README.md package.json LICENSE /output/ && cp -rf ./node_modules/* /node_modules_export/"]