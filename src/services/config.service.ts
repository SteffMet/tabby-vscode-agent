import { Injectable } from '@angular/core';

export interface McpConfig {
  enabled?: boolean;
  port?: number;
  serverUrl?: string;
  enableDebugLogging?: boolean;
}

export interface ConfigStore {
  mcp?: McpConfig;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private _store: ConfigStore = {
    mcp: {
      enabled: true,
      port: 3001,
      serverUrl: 'http://localhost:3001',
      enableDebugLogging: false
    }
  };

  get store(): ConfigStore {
    return this._store;
  }

  set store(value: ConfigStore) {
    this._store = value;
  }
} 