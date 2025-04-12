import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import TabbyCoreModule, { ConfigProvider, ToolbarButtonProvider } from 'tabby-core';
import { McpService } from './services/mcpService';
import { McpLoggerService } from './services/mcpLogger.service';
// import { TabToolCategory } from './tools/tab';
import { ExecToolCategory } from './tools/terminal';
import { ExecCommandButtonComponent } from './components/execCommandButton.component';
import { McpToolbarButtonProvider } from './toolbarButtonProvider';
import { McpSettingsTabProvider } from './settings';
import { SettingsTabProvider } from 'tabby-settings';

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
    McpLoggerService,
    // TabToolCategory,
    ExecToolCategory,
    { provide: ToolbarButtonProvider, useClass: McpToolbarButtonProvider, multi: true },
    { provide: SettingsTabProvider, useClass: McpSettingsTabProvider, multi: true }
  ],
  declarations: [
    ExecCommandButtonComponent
  ],
  exports: [
    ExecCommandButtonComponent
  ]
})
export default class McpModule {
  /**
   * Initialize the MCP service when the module is loaded
   */
  private constructor(private mcpService: McpService, private logger: McpLoggerService) {
    console.log('[McpModule] Initializing MCP service...');
    this.logger.info('MCP module initializing');
    this.mcpService.initialize().catch(err => {
      console.error('[McpModule] Failed to initialize MCP service:', err);
      this.logger.error('Failed to initialize MCP service', err);
    });
  }
}

export * from './services/mcpService';
export * from './services/mcpLogger.service';
export * from './type/types';