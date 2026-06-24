import { Component, inject } from '@angular/core';
import { CvPreviewClassicComponent } from '../../cv-preview-classic/cv-preview-classic.component';
import { CvPreviewComponent } from '../../cv-preview/cv-preview.component';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-cv-editor-preview-pane',
  standalone: true,
  imports: [
    CvPreviewComponent,
    CvPreviewClassicComponent,
  ],
  templateUrl: './cv-editor-preview-pane.component.html',
  styleUrl: './cv-editor-preview-pane.component.scss',
})
export class CvEditorPreviewPaneComponent {
  private readonly store = inject(CvStore);

  readonly cv = this.store.cv;
}
