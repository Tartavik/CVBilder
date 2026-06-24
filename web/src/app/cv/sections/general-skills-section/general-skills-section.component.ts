import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { CvStore } from '../../cv.store';
import {
  findSkillOptionByName,
  SKILL_OPTIONS,
  SkillOption,
} from '../../skill-catalog';
import { SkillIconComponent } from '../../skill-icon.component';

@Component({
  selector: 'app-general-skills-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    AppIconComponent,
    SkillIconComponent,
  ],
  templateUrl: './general-skills-section.component.html',
})
export class GeneralSkillsSectionComponent {
  private readonly store = inject(CvStore);
  readonly generalSkills = computed(() => this.store.cv().generalSkills);
  readonly skillOptions = computed<SkillOption[]>(() => {
    const skills = new Map<string, SkillOption>();
    SKILL_OPTIONS.forEach((option) =>
      skills.set(option.name.toLocaleLowerCase(), option),
    );
    this.store.userSkills().forEach((skill) => {
      const catalogOption = findSkillOptionByName(skill.name);
      skills.set(skill.name.toLocaleLowerCase(), {
        name: skill.name,
        icon: skill.icon ?? catalogOption?.icon ?? null,
        label: catalogOption?.label ?? skill.name.slice(0, 2).toLocaleUpperCase(),
        color: catalogOption?.color ?? '#2563eb',
      });
    });
    return [...skills.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

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
    const option = this.skillOptions().find(
      (item) => item.name.toLocaleLowerCase() === skill.toLocaleLowerCase(),
    );
    const name = option?.name ?? skill;
    this.store.updateGeneralSkills([...this.generalSkills(), name]);
    this.store.rememberUserSkill({
      name,
      icon: option?.icon ?? findSkillOptionByName(name)?.icon ?? null,
    });
    this.newSkill.reset();
  }

  selectSkill(name: string): void {
    this.newSkill.setValue(name);
  }

  hasSkillDraft(): boolean {
    return Boolean(this.newSkill.value?.trim());
  }

  clearSkillDraft(): void {
    this.newSkill.reset();
  }

  filteredSkillOptions(): SkillOption[] {
    const search = this.newSkill.value?.trim().toLocaleLowerCase() ?? '';
    if (!search) return this.skillOptions().slice(0, 8);
    return this.skillOptions()
      .filter((skill) => skill.name.toLocaleLowerCase().includes(search))
      .slice(0, 8);
  }

  remove(skill: string) {
    this.store.updateGeneralSkills(
      this.generalSkills().filter((generalSkill) => generalSkill !== skill),
    );
  }
}
