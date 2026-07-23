import { Component, computed, inject, input } from '@angular/core';
import { CvSection, CvStore } from '../../cv.store';
import { AdditionalSectionsSectionComponent } from '../../sections/additional-sections-section/additional-sections-section.component';
import { EducationSectionComponent } from '../../sections/education-section/education-section.component';
import { ExperienceSectionComponent } from '../../sections/experience-section/experience-section.component';
import { GeneralSkillsSectionComponent } from '../../sections/general-skills-section/general-skills-section.component';
import { PersonalDetailsSectionComponent } from '../../sections/personal-details-section/personal-details-section.component';
import { PersonalMainSectionComponent } from '../../sections/personal-main-section/personal-main-section.component';
import { PersonalSectionComponent } from '../../sections/personal-section/personal-section.component';

@Component({
  selector: 'app-cv-editor-form',
  standalone: true,
  imports: [
    PersonalSectionComponent,
    PersonalDetailsSectionComponent,
    PersonalMainSectionComponent,
    ExperienceSectionComponent,
    EducationSectionComponent,
    GeneralSkillsSectionComponent,
    AdditionalSectionsSectionComponent,
  ],
  templateUrl: './cv-editor-form.component.html',
  styleUrl: './cv-editor-form.component.scss',
})
export class CvEditorFormComponent {
  private readonly store = inject(CvStore);

  readonly activeSection = input.required<CvSection['id']>();
  readonly cv = this.store.cv;
  readonly activeError = computed(() => {
    const error = this.store.error();
    return error && this.store.invalidSections().has(this.activeSection())
      ? error
      : null;
  });

  readonly activeLabel = computed(
    () =>
      this.store.sections.find(
        (section) => section.id === this.activeSection(),
      )?.label ?? '',
  );
}
