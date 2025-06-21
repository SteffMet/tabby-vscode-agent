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
    return `unset PROMPT_COMMAND; unset __tpc; unset __TM;`;
  }

  getSetupScript(startMarker: string, endMarker: string): string {
    const cleanup = this.getCleanupScript();
    return `__TM=0; function __tc() { ${cleanup} }; function __tpc() { if [[ $__TM -eq 0 ]]; then local e=$?; local c=$(HISTTIMEFORMAT='' history 1 | awk '{$1=""; print substr($0,2)}'); if [[ "$c" == *"${startMarker}"* ]]; then __TM=1; echo "${endMarker}"; echo "exit_code: $e"; __tc; fi; fi }; trap - DEBUG 2>/dev/null; PROMPT_COMMAND=$(echo "$PROMPT_COMMAND" | sed 's/__tpc;//g'); PROMPT_COMMAND="__tpc;$PROMPT_COMMAND"`;
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
    return `precmd_functions=(); unset __tpc; unset __TM;`;
  }

  getSetupScript(startMarker: string, endMarker: string): string {
    const cleanup = this.getCleanupScript();
    return `__TM=0;function __tc(){${cleanup}};function __tpc(){if [[ $__TM -eq 0 ]];then local e=$?;local c=$(fc -ln -1);if [[ "$c" == *"${startMarker}"* ]];then __TM=1;echo "${endMarker}";echo "exit_code: $e";__tc;fi;fi};precmd_functions=(__tpc)`;
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
    return `if [ -n "$OLD_PS1" ]; then PS1="$OLD_PS1"; unset OLD_PS1; fi; unset __tpc; rm -f "$__TF" 2>/dev/null; unset __TF;`;
  }

  getSetupScript(startMarker: string, endMarker: string): string {
    const cleanup = this.getCleanupScript();
    return `__TF="/tmp/tabby_cmd_$$"; function __tc() { ${cleanup} }; __tpc() { local e=$?; if [[ -f "$__TF" ]]; then echo "${endMarker}"; echo "exit_code: $e"; rm -f "$__TF" 2>/dev/null; __tc; fi }; trap 'if [[ -f "$__TF" ]]; then echo "${endMarker}"; echo "exit_code: $?"; rm -f "$__TF" 2>/dev/null; __tc; fi' EXIT; OLD_PS1="$PS1"; PS1='$(__tpc)'$PS1`;
  }

  getCommandPrefix(): string {
    return 'touch "$__TF"; ';
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
  detectShellType(terminalOutput: string): string | null {
    const lines = stripAnsi(terminalOutput).split('\n');
    if (lines[lines.length - 1].startsWith('SHELL_TYPE=')) {
      const shellType = lines[lines.length - 1].split('=')[1].trim();
      console.log(`[DEBUG] Raw detected shell type: "${shellType}"`);
      return shellType;
    }
    return null;
  }
}
