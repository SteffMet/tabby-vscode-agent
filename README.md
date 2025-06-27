# 🚀 Tabby-MCP-Server

[![npm version](https://img.shields.io/npm/v/tabby-mcp.svg)](https://www.npmjs.com/package/tabby-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/thuanpham582002/tabby-mcp-server.svg)](https://github.com/thuanpham582002/tabby-mcp-server/issues)
[![GitHub stars](https://img.shields.io/github/stars/thuanpham582002/tabby-mcp-server.svg)](https://github.com/thuanpham582002/tabby-mcp-server/stargazers)

> Powerful Tabby plugin that implements Model Context Protocol (MCP) server, enabling AI-powered terminal control and automation.
> 
> Plugin for [Tabby Terminal](https://github.com/Eugeny/tabby) - a modern, highly configurable terminal emulator.

## 📹 Video Demo

Watch the full video demonstration of Tabby-MCP in action:

[![Tabby MCP Plugin - AI Terminal Integration Demo](https://img.youtube.com/vi/uFWBGiD4x9c/0.jpg)](https://youtu.be/uFWBGiD4x9c)

## ✨ Features

- 🤖 **AI Connection**: Seamlessly connect AI assistants to your terminal
- 🔌 **MCP Server**: Built-in Model Context Protocol server implementation
- 🖥️ **Terminal Control**: Allow AI to execute commands and read terminal output
- 🔍 **Session Management**: View and manage SSH sessions
- 🚫 **Command Abort**: Safely abort running commands
- 📋 **Buffer Access**: Retrieve terminal buffer content with flexible options
- 🔒 **Pair Programming Mode**: Optional confirmation dialog before command execution
- 📊 **Command History**: Track and review previously executed commands
- 🔄 **Command Output Storage**: Paginated access to complete command outputs

## 📋 Table of Contents

- [🚀 Tabby-MCP-Server](#-tabby-mcp-server)
  - [📹 Video Demo](#-video-demo)
  - [✨ Features](#-features)
  - [📋 Table of Contents](#-table-of-contents)
  - [🔧 Installation](#-installation)
    - [Install from Tabby Plugin Store](#install-from-tabby-plugin-store)
    - [Using Docker](#using-docker)
  - [🚀 Quick Start](#-quick-start)
  - [💻 Usage Examples](#-usage-examples)
    - [Connect an AI to Control Your Terminal](#connect-an-ai-to-control-your-terminal)
  - [🔗 Connecting to MCP](#-connecting-to-mcp)
  - [⚙️ Configuration](#️-configuration)
    - [Pair Programming Mode](#pair-programming-mode)
  - [📚 API Reference](#-api-reference)
    - [Available Tools](#available-tools)
  - [🤝 Contributing](#-contributing)
    - [Development Workflow](#development-workflow)
  - [📝 License](#-license)

## 🔧 Installation

### Install from Tabby Plugin Store

1. Go to Tabby settings → Plugins → MCP
2. Click "Install" on the Tabby MCP plugin
3. Restart Tabby
4. Configure your AI client to connect to the MCP server (see [Connecting to MCP](#-connecting-to-mcp))

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

## 🚀 Quick Start

1. Install the plugin using one of the methods above
2. Start Tabby and navigate to Settings → Plugins → MCP
3. Configure the MCP server port (default: 3001)
4. Toggle "Start on Boot" to automatically start the server when Tabby launches
5. Connect to the MCP server from any supported AI client listed at https://modelcontextprotocol.io/clients

## 💻 Usage Examples

### Connect an AI to Control Your Terminal

1. Start Tabby with the MCP plugin enabled
2. Configure your AI client to connect to the MCP server (see [Connecting to MCP](#-connecting-to-mcp))
3. Ask your AI assistant to run commands or manage your terminal sessions

Example AI prompt:
```
Connect to my Tabby MCP server and list all available terminal sessions.
Then execute the command "ls -la" in the first available terminal.
```

## 🔗 Connecting to MCP

To configure AI clients to use your MCP server, add the following to your `~/.cursor/mcp.json` file:

STDIO mode:
```json
{
  "mcpServers": {
    "Tabby MCP": {
      "type": "sse",
      "url": "http://localhost:3001/sse"
    },
    "Tabby MCP STDIO": {
      "command": "npx",
      "args": [
        "-y",
        "tabby-mcp-stdio",
        "--port",
        "3001"
      ]
    }
  }
}
```

SSE mode:
```json
{
  "mcpServers": {
    "Tabby MCP": {
      "type": "sse",
      "url": "http://localhost:3001/sse"
    }
  }
}
```

Select your preferred MCP server in your AI client settings. The Tabby MCP plugin must be running for the "Tabby MCP" (SSE) option to work, while the STDIO and Docker options will start their own server instances.

## ⚙️ Configuration

Configure the MCP server through the Tabby settings:

```json
{
  "mcp": {
    "port": 3001,
    "host": "http://localhost:3001",
    "enableLogging": false,
    "startOnBoot": true,
    "pairProgrammingMode": {
      "enabled": true,
      "showConfirmationDialog": true,
      "autoFocusTerminal": true
    }
  }
}
```

### Pair Programming Mode

The plugin includes a "Pair Programming Mode" that adds safety features when AI assistants control your terminal:

- **Confirmation Dialog**: Prompt user before executing commands
- **Auto Focus Terminal**: Automatically focus terminal when commands are executed
- **Command Rejection**: Ability to reject commands with feedback

To enable Pair Programming Mode:

1. Go to Tabby settings → Plugins → MCP
2. Toggle "Enable Pair Programming Mode"
3. Configure additional safety options as needed

## 📚 API Reference

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_ssh_session_list` | Get list of all terminal sessions | None |
| `exec_command` | Execute a command in terminal | `command`, `tabId`, `commandExplanation` |
| `get_terminal_buffer` | Get terminal content | `tabId`, `startLine`, `endLine` |
| `get_command_output` | Retrieve complete command output | `outputId`, `startLine`, `maxLines` |

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

See the [contributing guidelines](CONTRIBUTING.md) for more details.

### Development Workflow

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/thuanpham582002/tabby-mcp-server.git
   cd tabby-mcp-server
   npm install
   ```

2. Make your changes to the codebase

3. Build the plugin:
   ```bash
   docker build -t tabby-mcp . && docker run -v $(pwd)/build:/output tabby-mcp
   ```

4. Test the plugin with Tabby:
   ```bash
   bash scripts/copy_to_plugin_folder.sh
   ```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/thuanpham582002">Pham Tien Thuan</a>
</p>