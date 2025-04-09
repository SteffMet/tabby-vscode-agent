import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExecToolCategory } from '../tools/terminal';

@Component({
  selector: 'exec-command-button',
  template: `
    <button 
      class="btn btn-sm"
      [class.btn-danger]="isCommandRunning" 
      [class.btn-link]="!isCommandRunning"
      (click)="onAbortClick()" 
      *ngIf="isCommandRunning">
      <i class="fas fa-spinner fa-spin me-1"></i>
      <span translate>Running {{commandName}} (click to abort)</span>
    </button>
  `,
  styles: [`
    .btn { 
      margin-right: 5px;
      white-space: nowrap;
    }
  `]
})
export class ExecCommandButtonComponent implements OnInit, OnDestroy {
  isCommandRunning = false;
  commandName = '';
  private subscription: Subscription;

  constructor(
    private execToolCategory: ExecToolCategory
  ) { }

  ngOnInit(): void {
    this.subscription = this.execToolCategory.activeCommand$.subscribe(command => {
      this.isCommandRunning = !!command;
      this.commandName = command?.command || '';
      
      // Shorten command name if too long
      if (this.commandName.length > 15) {
        this.commandName = this.commandName.substring(0, 12) + '...';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onAbortClick(): void {
    if (this.isCommandRunning) {
      this.execToolCategory.abortCurrentCommand();
    }
  }
} 