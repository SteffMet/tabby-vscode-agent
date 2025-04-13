import stripAnsi from 'strip-ansi';

/**
 * Interface for shell strategy
 * Defines the contract for different shell implementations
 */
export interface ShellStrategy {
  /**
   * Get the shell type identifier
   */
  getShellType(): string;
  
  /**
   * Get the setup script for this shell type
   * @param startMarker The start marker for command tracking
   * @param endMarker The end marker for command tracking
   */
  getSetupScript(startMarker: string, endMarker: string): string;
  
  /**
   * Get the command prefix for this shell type
   */
  getCommandPrefix(): string;
  
  /**
   * Get the cleanup script for this shell type
   */
  getCleanupScript(): string;
}

/**
 * Base abstract class for shell strategies
 */
export abstract class BaseShellStrategy implements ShellStrategy {
  abstract getShellType(): string;
  abstract getSetupScript(startMarker: string, endMarker: string): string;
  abstract getCleanupScript(): string;
  
  /**
   * Default command prefix is empty
   */
  getCommandPrefix(): string {
    return '';
  }
}

/**
 * Bash shell strategy
 */
export class BashShellStrategy extends BaseShellStrategy {
  getShellType(): string {
    return 'bash';
  }
  
  getCleanupScript(): string {
    return `unset PROMPT_COMMAND; unset __tabby_post_command; unset __TABBY_MARKER_EMITTED;`;
  }
  
  getSetupScript(startMarker: string, endMarker: string): string {
    const cleanup = this.getCleanupScript();
    return `__TABBY_MARKER_EMITTED=0; function __tabby_cleanup() { ${cleanup} }; function __tabby_post_command() { if [ $__TABBY_MARKER_EMITTED -eq 0 ]; then local exit_code=$?; local last_cmd=$(HISTTIMEFORMAT='' history 1 | awk '{$1=""; print substr($0,2)}'); if [[ "$last_cmd" == "echo \\"${startMarker}\\""* ]]; then __TABBY_MARKER_EMITTED=1; echo "${endMarker}"; echo "exit_code: $exit_code"; __tabby_cleanup; fi; fi; }; trap - DEBUG 2>/dev/null; PROMPT_COMMAND=$(echo "$PROMPT_COMMAND" | sed 's/__tabby_post_command;//g'); PROMPT_COMMAND="__tabby_post_command;$PROMPT_COMMAND"`;
  }
}

/**
 * Zsh shell strategy
 */
export class ZshShellStrategy extends BaseShellStrategy {
  getShellType(): string {
    return 'zsh';
  }
  
  getCleanupScript(): string {
    return `precmd_functions=(); unset __tabby_post_command; unset __TABBY_MARKER_EMITTED;`;
  }
  
  getSetupScript(startMarker: string, endMarker: string): string {
    const cleanup = this.getCleanupScript();
    return `__TABBY_MARKER_EMITTED=0; function __tabby_cleanup() { ${cleanup} }; function __tabby_post_command() { if [ $__TABBY_MARKER_EMITTED -eq 0 ]; then local exit_code=$?; local last_cmd=$(fc -ln -1); if [[ "$last_cmd" == "echo \\"${startMarker}\\""* ]]; then __TABBY_MARKER_EMITTED=1; echo "${endMarker}"; echo "exit_code: $exit_code"; __tabby_cleanup; fi; fi; }; precmd_functions=(); precmd_functions=(__tabby_post_command)`;
  }
}

/**
 * POSIX sh shell strategy
 */
export class ShShellStrategy extends BaseShellStrategy {
  getShellType(): string {
    return 'sh';
  }
  
  getCleanupScript(): string {
    return `if [ -n "$OLD_PS1" ]; then PS1="$OLD_PS1"; unset OLD_PS1; fi; unset __tabby_post_command; rm -f "$__TABBY_CMD_FLAG" 2>/dev/null; unset __TABBY_CMD_FLAG;`;
  }
  
  getSetupScript(startMarker: string, endMarker: string): string {
    const cleanup = this.getCleanupScript();
    return `__TABBY_CMD_FLAG="/tmp/tabby_cmd_$$"; function __tabby_cleanup() { ${cleanup} }; __tabby_post_command() { local exit_code=$?; if [ -f "$__TABBY_CMD_FLAG" ]; then echo "${endMarker}"; echo "exit_code: $exit_code"; rm -f "$__TABBY_CMD_FLAG" 2>/dev/null; __tabby_cleanup; fi; }; OLD_PS1="$PS1"; PS1='$(__tabby_post_command)'$PS1`;
  }
  
  getCommandPrefix(): string {
    return 'touch "$__TABBY_CMD_FLAG"; ';
  }
}

/**
 * Unknown shell strategy - fallback to sh
 */
export class UnknownShellStrategy extends ShShellStrategy {
  getShellType(): string {
    return 'unknown';
  }
}

/**
 * Shell context class that manages shell strategies
 */
export class ShellContext {
  private strategies: Map<string, ShellStrategy> = new Map();
  private defaultStrategy: ShellStrategy;
  
  constructor() {
    // Register built-in strategies
    const bashStrategy = new BashShellStrategy();
    const zshStrategy = new ZshShellStrategy();
    const shStrategy = new ShShellStrategy();
    const unknownStrategy = new UnknownShellStrategy();
    
    this.registerStrategy(bashStrategy);
    this.registerStrategy(zshStrategy);
    this.registerStrategy(shStrategy);
    this.registerStrategy(unknownStrategy);
    
    // Set default strategy
    this.defaultStrategy = unknownStrategy;
  }
  
  /**
   * Register a new shell strategy
   * @param strategy The shell strategy to register
   */
  registerStrategy(strategy: ShellStrategy): void {
    this.strategies.set(strategy.getShellType(), strategy);
  }
  
  /**
   * Get a shell strategy by type
   * @param shellType The shell type to get
   * @returns The shell strategy for the given type, or the default strategy if not found
   */
  getStrategy(shellType: string): ShellStrategy {
    const normalizedType = shellType.trim().toLowerCase();
    return this.strategies.get(normalizedType) || this.defaultStrategy;
  }
  
  /**
   * Generate shell detection script
   * @returns Shell detection script
   */
  getShellDetectionScript(): string {
    const bashType = new BashShellStrategy().getShellType();
    const zshType = new ZshShellStrategy().getShellType();
    const shType = new ShShellStrategy().getShellType();
    const unknownType = new UnknownShellStrategy().getShellType();
    
    return `if [ -n "$BASH_VERSION" ]; then echo "SHELL_TYPE=${bashType}"; elif [ -n "$ZSH_VERSION" ]; then echo "SHELL_TYPE=${zshType}"; elif [ "$(basename "$0")" = "sh" ] || [ "$0" = "-sh" ] || [ "$0" = "/bin/sh" ] || [ -n "$PS1" ]; then echo "SHELL_TYPE=${shType}"; else echo "SHELL_TYPE=${unknownType}"; fi`;
  }
  
  /**
   * Detect shell type from terminal output
   * @param terminalOutput The terminal output containing shell type
   * @returns The detected shell type
   */
  detectShellType(terminalOutput: string): string {
    const lines = stripAnsi(terminalOutput).split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.startsWith('SHELL_TYPE=')) {
        // Trim any whitespace or special characters
        const shellType = line.split('=')[1].trim();
        console.log(`[DEBUG] Raw detected shell type: "${shellType}"`);
        return shellType;
      }
    }
    return this.defaultStrategy.getShellType();
  }
}
