import { Component, inject } from '@angular/core';
import { CvStore } from '../cv.store';
import { SkillIconComponent } from '../skill-icon.component';

@Component({
  selector: 'app-cv-preview-classic',
  standalone: true,
  imports: [SkillIconComponent],
  templateUrl: './cv-preview-classic.component.html',
  styleUrl: './cv-preview-classic.component.scss',
})
export class CvPreviewClassicComponent {
  private readonly store = inject(CvStore);
  readonly cv = this.store.cv;
}
