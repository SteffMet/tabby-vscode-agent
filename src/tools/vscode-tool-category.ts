import { Injectable } from '@angular/core';
import { ToolCategory } from '../type/types';
import { VSCodeTool } from './terminal/vscode-tool';

@Injectable({ providedIn: 'root' })
export class VSCodeToolCategory implements ToolCategory {
    name: string;
    mcpTools: any[];

    constructor(private vscodeTool: VSCodeTool) {
        this.name = 'vscode';
        this.mcpTools = [vscodeTool.getTool()];
    }
}