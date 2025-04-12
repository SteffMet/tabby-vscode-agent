import { McpTool } from '../../type/types';
import { McpLoggerService } from '../../services/mcpLogger.service';

/**
 * Base class for terminal tools
 */
export abstract class BaseTool<T = any> {
  protected logger: McpLoggerService;
  
  constructor(logger: McpLoggerService) {
    this.logger = logger;
  }
  /**
   * Get the tool definition
   */
  abstract getTool(): McpTool<T>;
}
