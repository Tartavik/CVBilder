import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">
        {{ data.cancelText ?? 'Cancel' }}
      </button>
      <button mat-flat-button color="warn" type="button" (click)="close(true)">
        {{ data.confirmText ?? 'Delete' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      h2 {
        margin: 0;
      }

      p {
        margin: 0;
        color: #4b5563;
        line-height: 1.45;
      }

      mat-dialog-content {
        padding-top: 4px;
      }

      mat-dialog-actions {
        padding-top: 12px;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
