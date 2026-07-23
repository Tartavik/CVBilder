import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CvTemplate } from '../../users-api.service';

@Component({
  selector: 'app-template-picker-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './template-picker-dialog.component.html',
  styleUrl: './template-picker-dialog.component.scss',
})
export class TemplatePickerDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<TemplatePickerDialogComponent, CvTemplate | undefined>,
  );

  select(template: CvTemplate): void {
    this.dialogRef.close(template);
  }
}
