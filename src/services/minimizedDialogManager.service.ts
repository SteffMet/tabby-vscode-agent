import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Interface for minimized dialog data
 */
export interface MinimizedDialog {
  id: string;
  title: string;
  component: any;
  instance: any;
  modalRef: any;
  timestamp: number;
  promiseResolver?: {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  };
}

/**
 * Service to manage minimized dialogs
 */
@Injectable({ providedIn: 'root' })
export class MinimizedDialogManagerService {
  private minimizedDialogs = new BehaviorSubject<MinimizedDialog[]>([]);
  
  /** Observable for minimized dialogs */
  get minimizedDialogs$(): Observable<MinimizedDialog[]> {
    return this.minimizedDialogs.asObservable();
  }

  /** Get current minimized dialogs */
  get dialogs(): MinimizedDialog[] {
    return this.minimizedDialogs.value;
  }

  /**
   * Minimize a dialog
   */
  minimizeDialog(dialog: MinimizedDialog): void {
    const current = this.minimizedDialogs.value;
    const existingIndex = current.findIndex(d => d.id === dialog.id);
    
    if (existingIndex >= 0) {
      // Update existing dialog
      const updated = [...current];
      updated[existingIndex] = dialog;
      this.minimizedDialogs.next(updated);
    } else {
      // Add new dialog
      const updated = [...current, dialog];
      this.minimizedDialogs.next(updated);
    }
  }

  /**
   * Restore a minimized dialog
   */
  restoreDialog(dialogId: string): MinimizedDialog | null {
    const current = this.minimizedDialogs.value;
    const dialog = current.find(d => d.id === dialogId);
    
    if (dialog) {
      const updated = current.filter(d => d.id !== dialogId);
      this.minimizedDialogs.next(updated);
      return dialog;
    }
    
    return null;
  }

  /**
   * Close a minimized dialog completely
   */
  closeMinimizedDialog(dialogId: string): void {
    const current = this.minimizedDialogs.value;
    const updated = current.filter(d => d.id !== dialogId);
    this.minimizedDialogs.next(updated);
  }

  /**
   * Check if a dialog is minimized
   */
  isDialogMinimized(dialogId: string): boolean {
    return this.minimizedDialogs.value.some(d => d.id === dialogId);
  }

  /**
   * Clear all minimized dialogs
   */
  clearAll(): void {
    this.minimizedDialogs.next([]);
  }

  /**
   * Generate unique dialog ID
   */
  generateDialogId(): string {
    return `dialog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 