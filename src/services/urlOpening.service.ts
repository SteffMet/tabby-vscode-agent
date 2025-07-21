import { Injectable } from '@angular/core';
import { exec } from 'child_process';
import { McpLoggerService } from './mcpLogger.service';

@Injectable({ providedIn: 'root' })
export class UrlOpeningService {
  constructor(private logger: McpLoggerService) {}

  openUrl(url: string): void {
    this.logger.info(`Opening URL: ${url}`);
    exec(`start ${url}`, (error) => {
      if (error) {
        this.logger.error(`Failed to open URL: ${url}. Falling back to window.open.`, error);
        window.open(url, '_blank');
      }
    });
  }
}