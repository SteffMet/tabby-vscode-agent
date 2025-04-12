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
- [License](#license)

## 🔧 Installation

```bash
# Install via npm
npm install tabby-mcp --save

# Or using yarn
yarn add tabby-mcp
```

## 🚀 Quick Start

1. Install the plugin
2. Configure your Tabby environment
3. Connect your AI assistant

```typescript
// Import the plugin
import { TabbyMcpPlugin } from 'tabby-mcp';

// Initialize
const mcpPlugin = new TabbyMcpPlugin();

// Start the MCP server
mcpPlugin.startServer();
```

## 💻 Usage Examples

### Connect an AI to Control Your Terminal

```typescript
// Connect your AI assistant to the MCP server
const mcpClient = new McpClient('http://localhost:3000');

// Execute a command in terminal
await mcpClient.tools.execCommand({
  command: 'ls -la',
  tabId: 'terminal-1'
});

// Get terminal buffer content
const result = await mcpClient.tools.getTerminalBuffer({
  tabId: 'terminal-1',
  startLine: 1,
  endLine: 10
});
```

### Retrieve SSH Session List

```typescript
// Get all SSH sessions
const sessions = await mcpClient.tools.getSshSessionList();

// Display sessions
console.log(sessions);
```

## ⚙️ Configuration

Configure the MCP server through the Tabby settings:

```json
{
  "mcp": {
    "port": 3000,
    "host": "localhost",
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

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🖼️ Demo Assets

The project includes an `assets` directory structure for storing demo media files:

```
assets/
├── images/    # Screenshots and diagrams
├── videos/    # Video tutorials and demos
└── gifs/      # Animated GIFs showing features
```

When adding demo media:

- Place demonstration GIFs in `assets/gifs/`
- Add screenshots in `assets/images/`
- Store video tutorials in `assets/videos/`
- Reference them in documentation using relative paths

For guidelines on creating effective demo media, see [assets/README.md](assets/README.md).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/thuanpham582002">Pham Tien Thuan</a>
</p>