import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-general-skills-section',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatChipsModule, AppIconComponent],
  templateUrl: './general-skills-section.component.html',
})
export class GeneralSkillsSectionComponent {
  private readonly store = inject(CvStore);
  readonly generalSkills = computed(() => this.store.cv().generalSkills);

  readonly newSkill = new FormControl('');

  add() {
    const skill = this.newSkill.value?.trim() ?? '';
    if (
      !skill ||
      this.generalSkills().some(
        (generalSkill) =>
          generalSkill.toLocaleLowerCase() === skill.toLocaleLowerCase(),
      )
    ) {
      return;
    }
    this.store.updateGeneralSkills([...this.generalSkills(), skill]);
    this.newSkill.reset();
  }

  remove(skill: string) {
    this.store.updateGeneralSkills(
      this.generalSkills().filter((generalSkill) => generalSkill !== skill),
    );
  }
}
