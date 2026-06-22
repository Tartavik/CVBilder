import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { IconLabelComponent } from '../../shared/icon-label.component';
import {
  SegmentedControlComponent,
  SegmentedControlOption,
} from '../../shared/segmented-control.component';
import { CvStore, CvTemplate } from '../cv.store';
import { CvPreviewClassicComponent } from '../cv-preview-classic/cv-preview-classic.component';
import { CvPreviewComponent } from '../cv-preview/cv-preview.component';

@Component({
  selector: 'app-cv-editor-preview-pane',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    IconLabelComponent,
    SegmentedControlComponent,
    CvPreviewComponent,
    CvPreviewClassicComponent,
  ],
  templateUrl: './cv-editor-preview-pane.component.html',
  styleUrl: './cv-editor-preview-pane.component.scss',
})
export class CvEditorPreviewPaneComponent {
  private readonly store = inject(CvStore);

  readonly cvId = input.required<string>();
  readonly saveSuccess = input(false);
  readonly templateChange = output<CvTemplate>();
  readonly save = output<void>();
  readonly exportPdf = output<void>();
  readonly logout = output<void>();

  readonly cv = this.store.cv;
  readonly saving = this.store.loading;
  readonly error = this.store.error;
  readonly templateOptions: readonly SegmentedControlOption[] = [
    { value: 'single', label: 'Single' },
    { value: 'classic', label: 'Classic' },
  ];

  selectTemplate(template: string): void {
    this.templateChange.emit(template as CvTemplate);
  }
}
