import { Component, inject } from '@angular/core';
import { AdditionalSectionsPreviewComponent } from '../additional-sections-preview/additional-sections-preview.component';
import { CvStore } from '../cv.store';
import { SkillIconComponent } from '../skill-icon.component';
import { PhoneFormatterService } from '../../shared/phone-field/phone-utils';

@Component({
  selector: 'app-cv-preview',
  standalone: true,
  imports: [SkillIconComponent, AdditionalSectionsPreviewComponent],
  templateUrl: './cv-preview.component.html',
  styleUrl: './cv-preview.component.scss',
})
export class CvPreviewComponent {
  private readonly store = inject(CvStore);
  private readonly phoneFormatter = inject(PhoneFormatterService);
  readonly cv = this.store.cv;
  readonly formatPhone = (phone: string) => this.phoneFormatter.format(phone);
}
