import { Component, computed, inject } from '@angular/core';
import { CvStore, ExperienceSkill } from '../../cv.store';
import { findSkillOptionByName } from '../../skill-catalog';
import { SkillSelectorComponent } from '../../skill-selector/skill-selector.component';

@Component({
  selector: 'app-general-skills-section',
  standalone: true,
  imports: [SkillSelectorComponent],
  templateUrl: './general-skills-section.component.html',
})
export class GeneralSkillsSectionComponent {
  private readonly store = inject(CvStore);
  readonly generalSkills = computed(() => this.store.cv().generalSkills);
  readonly selectedSkills = computed<ExperienceSkill[]>(() =>
    this.generalSkills().map((name) => {
      const savedSkill = this.store.userSkills().find(
        (skill) => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      );
      return {
        name,
        icon: savedSkill?.icon ?? findSkillOptionByName(name)?.icon ?? null,
      };
    }),
  );

  updateSkills(skills: ExperienceSkill[]): void {
    this.store.updateGeneralSkills(skills.map((skill) => skill.name));
  }
}
