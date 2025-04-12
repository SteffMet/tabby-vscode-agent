import { Component, HostBinding, OnInit } from '@angular/core';
import { ConfigService } from 'tabby-core';
import { McpService } from '../services/mcpService';
import { McpLoggerService } from '../services/mcpLogger.service';

/** @hidden */
@Component({
    templateUrl: './mcpSettingsTab.component.pug',
})
export class McpSettingsTabComponent implements OnInit {
    @HostBinding('class.content-box') true
    isServerRunning = false;
    serverUrl: string = 'http://localhost:3001';
    port: number = 3001;
    enableDebugLogging: boolean = false;
    startOnBoot: boolean = true;

    constructor(
        public config: ConfigService,
        private mcpService: McpService,
        private logger: McpLoggerService
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
                    enableDebugLogging: false
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
                console.log('Loaded values:', {
                    serverUrl: this.serverUrl,
                    port: this.port,
                    enableDebugLogging: this.enableDebugLogging,
                    startOnBoot: this.startOnBoot
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
                this.config.store.mcp = {};
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
                this.config.store.mcp = {};
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
                this.config.store.mcp = {};
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
                this.config.store.mcp = {};
            }
            this.config.store.mcp.startOnBoot = this.startOnBoot;
            this.config.save();
            this.logger.info(`Start on boot ${this.startOnBoot ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling start on boot:', error);
        }
    }
}
