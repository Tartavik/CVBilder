import { Component, inject } from '@angular/core';
import { CvStore } from '../cv.store';
import { SkillIconComponent } from '../skill-icon.component';

@Component({
  selector: 'app-cv-preview',
  standalone: true,
  imports: [SkillIconComponent],
  templateUrl: './cv-preview.component.html',
  styleUrl: './cv-preview.component.scss',
})
export class CvPreviewComponent {
  private readonly store = inject(CvStore);
  readonly cv = this.store.cv;
}
