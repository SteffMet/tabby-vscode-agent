import { Injectable } from '@angular/core';
import { ConfigService } from 'tabby-core';

/**
 * Logger service for MCP module
 * Provides logging capabilities with debug mode toggle
 */
@Injectable({ providedIn: 'root' })
export class McpLoggerService {
    private debugEnabled = false;
    
    constructor(private config: ConfigService) {
        // Initialize debug enabled from config in a safe way
        try {
            this.debugEnabled = !!(this.config.store && this.config.store.mcp && this.config.store.mcp.enableDebugLogging);
        } catch (err) {
            // Default to false if config is not available yet
            this.debugEnabled = false;
            console.log('[MCP Logger] Config not fully initialized, defaulting debug to false');
        }
    }
    
    /**
     * Set debug mode enabled/disabled
     */
    setDebugEnabled(enabled: boolean): void {
        this.debugEnabled = enabled;
    }
    
    /**
     * Log an informational message
     */
    info(message: string): void {
        console.log(`[MCP] ${message}`);
    }
    
    /**
     * Log a debug message (only shown when debug logging is enabled)
     */
    debug(message: string, data?: any): void {
        if (!this.debugEnabled) {
            return;
        }
        
        if (data) {
            console.log(`[MCP DEBUG] ${message}`, data);
        } else {
            console.log(`[MCP DEBUG] ${message}`);
        }
    }
    
    /**
     * Log an error message
     */
    error(message: string, error?: any): void {
        if (error) {
            console.error(`[MCP ERROR] ${message}`, error);
        } else {
            console.error(`[MCP ERROR] ${message}`);
        }
    }
    
    /**
     * Log a warning message
     */
    warn(message: string, data?: any): void {
        if (data) {
            console.warn(`[MCP WARNING] ${message}`, data);
        } else {
            console.warn(`[MCP WARNING] ${message}`);
        }
    }
}
