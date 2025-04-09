import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import TabbyCoreModule from 'tabby-core';
import { McpService } from './services/mcpService';
// import { TabToolCategory } from './tools/tab';
import { ExecToolCategory } from './tools/terminal';

/**
 * Module for the MCP server integration
 */
@NgModule({
  imports: [
    CommonModule,
    TabbyCoreModule
  ],
  providers: [
    McpService,
    // TabToolCategory,
    ExecToolCategory
  ],
})
export default class McpModule {
  /**
   * Initialize the MCP service when the module is loaded
   */
  private constructor(private mcpService: McpService) {
    console.log('[McpModule] Initializing MCP service...');
    this.mcpService.initialize().catch(err => {
      console.error('[McpModule] Failed to initialize MCP service:', err);
    });
  }
}

export * from './services/mcpService';
export * from './type/types';