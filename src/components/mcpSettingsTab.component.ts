import { Component, HostBinding, OnInit } from '@angular/core';
import { ConfigService } from 'tabby-core';
import { McpService } from '../services/mcpService';
import { McpLoggerService } from '../services/mcpLogger.service';
import { UrlOpeningService } from '../services/urlOpening.service';
import * as path from 'path';
import * as os from 'os';

/** @hidden */
@Component({
    template: require('./mcpSettingsTab.component.pug').default,
    styles: [require('./mcpSettingsTab.component.scss')],
})
export class McpSettingsTabComponent implements OnInit {
    isLightMode = false;
    toggleTheme(): void {
        this.isLightMode = !this.isLightMode;
        const root = document.querySelector('body');
        if (root) {
            if (this.isLightMode) {
                root.classList.add('light-mode');
            } else {
                root.classList.remove('light-mode');
            }
        }
    }
    @HostBinding('class.content-box') true;
    isServerRunning = false;
    serverUrl: string = 'http://localhost:3001';
    port: number = 3001;
    enableDebugLogging: boolean = false;
    startOnBoot: boolean = true;
    instructionsVisible = false;
    stdioServerPath: string;
    vscodeSettingsJson = `
"mcp.servers": {
  "tabby": {
    "url": "http://localhost:3001/sse",
    "type": "http"
  }
}`;

    stdioSettingsJson = `
{
    "servers": {
        "tabby": {
            "type": "stdio",
            "command": "npx",
            "args": [
                "tabby-mcp-stdio"
            ]
        }
    },
    "inputs": []
}`;

    copyConfigJson(type: string): void {
        let configText = '';
        if (type === 'http') {
            configText = this.vscodeSettingsJson.trim();
        } else if (type === 'stdio') {
            configText = this.stdioSettingsJson.trim();
        }
        if (configText) {
            navigator.clipboard.writeText(configText);
            this.logger.info(`Copied ${type} MCP config to clipboard`);
        }
    }

    // Pair Programming Mode settings
    pairProgrammingEnabled: boolean = false;
    autoFocusTerminal: boolean = true;
    showConfirmationDialog: boolean = true;
    showResultDialog: boolean = true;

    constructor(
        public config: ConfigService,
        private mcpService: McpService,
        private logger: McpLoggerService,
        private urlOpeningService: UrlOpeningService
    ) {
        console.log('McpSettingsTabComponent constructor');
    }

    ngOnInit(): void {
        console.log('McpSettingsTabComponent initialized');
        // Initialize config
        this.initializeConfig();

        // Load values from config
        this.loadConfigValues();

        // Check server status
        this.updateServerStatus();

        // Log initial state
        console.log('MCP Settings initial state:', {
            serverUrl: this.serverUrl,
            port: this.port,
            debugLogging: this.enableDebugLogging,
            startOnBoot: this.startOnBoot,
            configStore: this.config.store.mcp
        });

        this.setStdioServerPath();
    }

    private initializeConfig(): void {
        console.log('Initializing MCP config');
        try {
            if (!this.config.store.mcp) {
                console.log('Creating default MCP config section');
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
                this.config.save();
            } else if (!this.config.store.mcp.pairProgrammingMode) {
                // Initialize Pair Programming Mode settings if they don't exist
                this.config.store.mcp.pairProgrammingMode = {
                    enabled: false,
                    autoFocusTerminal: true,
                    showConfirmationDialog: true,
                    showResultDialog: true
                };
                this.config.save();
            }
        } catch (error) {
            console.error('Error initializing MCP config:', error);
        }
    }

    private loadConfigValues(): void {
        console.log('Loading MCP config values');
        try {
            if (this.config.store.mcp) {
                this.serverUrl = this.config.store.mcp.serverUrl || 'http://localhost:3001';
                this.port = this.config.store.mcp.port || 3001;
                this.enableDebugLogging = !!this.config.store.mcp.enableDebugLogging;
                this.startOnBoot = this.config.store.mcp.startOnBoot !== false; // Default to true if not set

                // Load Pair Programming Mode settings
                if (this.config.store.mcp.pairProgrammingMode) {
                    this.pairProgrammingEnabled = !!this.config.store.mcp.pairProgrammingMode.enabled;
                    this.autoFocusTerminal = this.config.store.mcp.pairProgrammingMode.autoFocusTerminal !== false; // Default to true
                    this.showConfirmationDialog = this.config.store.mcp.pairProgrammingMode.showConfirmationDialog !== false; // Default to true
                    this.showResultDialog = this.config.store.mcp.pairProgrammingMode.showResultDialog !== false; // Default to true
                }

                console.log('Loaded values:', {
                    serverUrl: this.serverUrl,
                    port: this.port,
                    enableDebugLogging: this.enableDebugLogging,
                    startOnBoot: this.startOnBoot,
                    pairProgrammingEnabled: this.pairProgrammingEnabled,
                    autoFocusTerminal: this.autoFocusTerminal,
                    showConfirmationDialog: this.showConfirmationDialog,
                    showResultDialog: this.showResultDialog
                });
            } else {
                console.warn('MCP config section not found');
            }
        } catch (error) {
            console.error('Error loading MCP config values:', error);
        }
    }

    saveServerUrl(): void {
        console.log(`Saving server URL: ${this.serverUrl}`);
        try {
            if (!this.config.store.mcp) {
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
            }
            this.config.store.mcp.serverUrl = this.serverUrl;
            this.config.save();
            this.logger.info(`Server URL updated to: ${this.serverUrl}`);
        } catch (error) {
            console.error('Error saving server URL:', error);
        }
    }

    savePort(): void {
        console.log(`Saving port: ${this.port}`);
        try {
            if (!this.config.store.mcp) {
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
            }
            this.config.store.mcp.port = this.port;
            this.config.save();
            this.logger.info(`Port updated to: ${this.port}`);
        } catch (error) {
            console.error('Error saving port:', error);
        }
    }

    async startServer(): Promise<void> {
        console.log('Starting MCP server');
        try {
            await this.mcpService.startServer(this.port);
            this.updateServerStatus();
            this.logger.info('MCP server started successfully');
        } catch (error) {
            console.error('Error starting MCP server:', error);
            this.logger.error('Failed to start MCP server', error);
        }
    }

    async stopServer(): Promise<void> {
        console.log('Stopping MCP server');
        try {
            await this.mcpService.stopServer();
            this.updateServerStatus();
            this.logger.info('MCP server stopped successfully');
        } catch (error) {
            console.error('Error stopping MCP server:', error);
            this.logger.error('Failed to stop MCP server', error);
        }
    }

    private async updateServerStatus(): Promise<void> {
        try {
            this.isServerRunning = await this.mcpService.isServerRunning();
            console.log(`Server status updated: ${this.isServerRunning ? 'running' : 'stopped'}`);
        } catch (error) {
            console.error('Error checking server status:', error);
        }
    }

    toggleDebugLogging(): void {
        console.log(`Toggling debug logging to: ${this.enableDebugLogging}`);
        try {
            if (!this.config.store.mcp) {
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
            }
            this.config.store.mcp.enableDebugLogging = this.enableDebugLogging;
            this.config.save();
            this.logger.setDebugEnabled(this.enableDebugLogging);
            this.logger.info(`Debug logging ${this.enableDebugLogging ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling debug logging:', error);
        }
    }

    toggleStartOnBoot(): void {
        console.log(`Toggling start on boot to: ${this.startOnBoot}`);
        try {
            if (!this.config.store.mcp) {
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
            }
            this.config.store.mcp.startOnBoot = this.startOnBoot;
            this.config.save();
            this.logger.info(`Start on boot ${this.startOnBoot ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling start on boot:', error);
        }
    }

    togglePairProgrammingMode(): void {
        console.log(`Toggling Pair Programming Mode to: ${this.pairProgrammingEnabled}`);
        try {
            if (!this.config.store.mcp) {
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
            }
            if (!this.config.store.mcp.pairProgrammingMode) {
                this.config.store.mcp.pairProgrammingMode = {};
            }
            this.config.store.mcp.pairProgrammingMode.enabled = this.pairProgrammingEnabled;
            this.config.save();
            this.logger.info(`Pair Programming Mode ${this.pairProgrammingEnabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling Pair Programming Mode:', error);
        }
    }

    toggleAutoFocusTerminal(): void {
        console.log(`Toggling Auto Focus Terminal to: ${this.autoFocusTerminal}`);
        try {
            if (!this.config.store.mcp) {
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
            }
            if (!this.config.store.mcp.pairProgrammingMode) {
                this.config.store.mcp.pairProgrammingMode = {};
            }
            this.config.store.mcp.pairProgrammingMode.autoFocusTerminal = this.autoFocusTerminal;
            this.config.save();
            this.logger.info(`Auto Focus Terminal ${this.autoFocusTerminal ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling Auto Focus Terminal:', error);
        }
    }

    toggleShowConfirmationDialog(): void {
        console.log(`Toggling Show Confirmation Dialog to: ${this.showConfirmationDialog}`);
        try {
            if (!this.config.store.mcp) {
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
            }
            if (!this.config.store.mcp.pairProgrammingMode) {
                this.config.store.mcp.pairProgrammingMode = {};
            }
            this.config.store.mcp.pairProgrammingMode.showConfirmationDialog = this.showConfirmationDialog;
            this.config.save();
            this.logger.info(`Show Confirmation Dialog ${this.showConfirmationDialog ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling Show Confirmation Dialog:', error);
        }
    }

    toggleShowResultDialog(): void {
        console.log(`Toggling Show Result Dialog to: ${this.showResultDialog}`);
        try {
            if (!this.config.store.mcp) {
                this.config.store.mcp = {
                    startOnBoot: true,
                    enabled: true,
                    port: 3001,
                    serverUrl: 'http://localhost:3001',
                    enableDebugLogging: false,
                    pairProgrammingMode: {
                        enabled: false,
                        autoFocusTerminal: true,
                        showConfirmationDialog: true,
                        showResultDialog: true
                    }
                };
            }
            if (!this.config.store.mcp.pairProgrammingMode) {
                this.config.store.mcp.pairProgrammingMode = {};
            }
            this.config.store.mcp.pairProgrammingMode.showResultDialog = this.showResultDialog;
            this.config.save();
            this.logger.info(`Show Result Dialog ${this.showResultDialog ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling Show Result Dialog:', error);
        }
    }

    openGitHub(): void {
        this.urlOpeningService.openUrl('https://github.com/steffmet');
    }

    openVSCodeExtension(): void {
        this.urlOpeningService.openUrl('https://marketplace.visualstudio.com/items?itemName=TabbyCopilotConnector.tabby-copilot-opener');
    }

    toggleInstructions(): void {
        this.instructionsVisible = !this.instructionsVisible;
    }

    private setStdioServerPath(): void {
        const pluginDir = path.join(os.homedir(), 'AppData', 'Roaming', 'tabby', 'plugins', 'node_modules', 'tabby-vscode-agent');
        this.stdioServerPath = path.join(pluginDir, 'node_modules', 'tabby-mcp-stdio', 'mcp-server-standalone.js');
    }

    copyStdioPath(): void {
        if (this.stdioServerPath) {
            navigator.clipboard.writeText(this.stdioServerPath);
            this.logger.info('Copied stdio server path to clipboard');
        }
    }
}
