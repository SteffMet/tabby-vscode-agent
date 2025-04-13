# 🚀 Tabby-MCP-Server

[![npm version](https://img.shields.io/npm/v/tabby-mcp.svg)](https://www.npmjs.com/package/tabby-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/thuanpham582002/tabby-mcp-server.svg)](https://github.com/thuanpham582002/tabby-mcp-server/issues)
[![GitHub stars](https://img.shields.io/github/stars/thuanpham582002/tabby-mcp-server.svg)](https://github.com/thuanpham582002/tabby-mcp-server/stargazers)

> Powerful Tabby plugin that implements Model Context Protocol (MCP) server, enabling AI-powered terminal control and automation.

![Demo](https://raw.githubusercontent.com/thuanpham582002/tabby-mcp-server/main/assets/demo.gif)

## ✨ Features

- 🤖 **AI Connection**: Seamlessly connect AI assistants to your terminal
- 🔌 **MCP Server**: Built-in Model Context Protocol server implementation
- 🖥️ **Terminal Control**: Allow AI to execute commands and read terminal output
- 🔍 **Session Management**: View and manage SSH sessions
- 🚫 **Command Abort**: Safely abort running commands
- 📋 **Buffer Access**: Retrieve terminal buffer content with flexible options

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Contributing](#contributing)
  - [Continuous Integration](#continuous-integration)
- [License](#license)

## 🔧 Installation

### Using Docker

You can build and install the plugin using Docker with the following command:

```bash
git clone https://github.com/thuanpham582002/tabby-mcp-server.git
cd tabby-mcp-server
# Build the Docker image
docker build -t tabby-mcp . && docker run -v $(pwd)/build:/output tabby-mcp
bash scripts/copy_to_plugin_folder.sh
```

This command builds a Docker image tagged as 'tabby-mcp' and runs a container from this image, mounting your local 'build' directory to '/output' in the container. The script `scripts/copy_to_plugin_folder.sh` will copy the built files to the Tabby plugin folder.

> **Note:** Our CI/CD workflows on GitHub also use this Docker-based build process to ensure consistency between local development and production releases.

## 🚀 Quick Start

1. Install the plugin
2. Configure your Tabby environment
3. Connect to MCP server from any of the supported clients listed at https://modelcontextprotocol.io/clients

## 💻 Usage Examples

### Connect an AI to Control Your Terminal

### Retrieve SSH Session List

## ⚙️ Configuration

Configure the MCP server through the Tabby settings:

```json
{
  "mcp": {
    "port": 3001,
    "host": "localhost:3001",
    "enableLogging": true,
    "allowedOrigins": ["*"]
  }
}
```

## 📚 API Reference

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `getSshSessionList` | Get list of SSH sessions | None |
| `execCommand` | Execute a command in terminal | `command`, `tabId` |
| `getTerminalBuffer` | Get terminal content | `tabId`, `startLine`, `endLine` |
| `abortCommand` | Abort a running command | None |

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See the [contributing guidelines](CONTRIBUTING.md) for more details.

### Continuous Integration

Our project uses GitHub Actions for CI/CD with Docker-based builds:

- **Pull Requests**: Automatically built and tested using Docker to ensure compatibility
- **Main Branch**: Builds with Docker, publishes to npm, and creates GitHub releases
- **Benefits**: Consistent environment across development, testing, and production

To set up the CI/CD pipeline in your fork:

1. Configure the required secrets in your repository settings:
   - `NPM_TOKEN`: Your npm access token for publishing
   - `GITHUB_TOKEN`: Automatically provided by GitHub Actions

2. The workflows will automatically run on push and pull request events.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/thuanpham582002">Pham Tien Thuan</a>
</p>