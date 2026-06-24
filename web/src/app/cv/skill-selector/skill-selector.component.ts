import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppIconComponent } from '../../shared/app-icon.component';
import { CvStore, ExperienceSkill } from '../cv.store';
import {
  findSkillOptionByName,
  SKILL_OPTIONS,
  SkillOption,
} from '../skill-catalog';
import { SkillIconComponent } from '../skill-icon.component';

@Component({
  selector: 'app-skill-selector',
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
  templateUrl: './skill-selector.component.html',
})
export class SkillSelectorComponent {
  private readonly store = inject(CvStore);

  readonly selectedSkills = input<ExperienceSkill[]>([]);
  readonly showIcons = input(false);
  readonly allowImageUpload = input(false);
  readonly inputLabel = input('Find or add skill');
  readonly placeholder = input('e.g. Angular');
  readonly addButtonLabel = input('Add skill');
  readonly selectedSkillsChange = output<ExperienceSkill[]>();

  readonly skillInput = new FormControl('', { nonNullable: true });
  readonly draftIcon = signal<string | null>(null);
  readonly draftRevision = signal(0);
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

  addSkill(): void {
    const draftName = this.skillInput.value.trim();
    if (
      !draftName ||
      this.selectedSkills().some(
        (skill) =>
          skill.name.toLocaleLowerCase() === draftName.toLocaleLowerCase(),
      )
    ) {
      return;
    }

    const selectedOption = this.findOption(draftName);
    const catalogOption = findSkillOptionByName(draftName);
    const newSkill = {
      name: selectedOption?.name ?? draftName,
      icon: this.draftIcon() ?? selectedOption?.icon ?? catalogOption?.icon ?? null,
    };
    this.selectedSkillsChange.emit([...this.selectedSkills(), newSkill]);
    this.store.rememberUserSkill(newSkill);
    this.clearSkillDraft();
  }

  removeSkill(skill: ExperienceSkill): void {
    this.selectedSkillsChange.emit(
      this.selectedSkills().filter((item) => item.name !== skill.name),
    );
  }

  selectSkill(name: string): void {
    this.skillInput.setValue(name);
    this.draftIcon.set(this.findOption(name)?.icon ?? null);
    this.refreshDraft();
  }

  filteredSkillOptions(): SkillOption[] {
    this.draftRevision();
    const search = this.skillInput.value.trim().toLocaleLowerCase();
    if (!search) return this.skillOptions().slice(0, 8);
    return this.skillOptions()
      .filter((skill) => skill.name.toLocaleLowerCase().includes(search))
      .slice(0, 8);
  }

  selectedSkillPreview(): ExperienceSkill {
    this.draftRevision();
    const name = this.skillInput.value.trim() || 'Skill';
    return { name, icon: this.draftIcon() };
  }

  hasSkillDraft(): boolean {
    this.draftRevision();
    return Boolean(this.skillInput.value.trim() || this.draftIcon());
  }

  hasSkillImageDraft(): boolean {
    this.draftRevision();
    return Boolean(this.draftIcon());
  }

  clearSkillDraft(): void {
    this.skillInput.reset();
    this.draftIcon.set(null);
    this.refreshDraft();
  }

  clearSkillImage(): void {
    this.draftIcon.set(null);
    this.refreshDraft();
  }

  onDraftInput(): void {
    this.refreshDraft();
  }

  onSkillImageChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const icon = String(reader.result ?? '');
      this.draftIcon.set(icon);
      this.applySkillImageDraft(icon);
      this.refreshDraft();
    };
    reader.readAsDataURL(file);
    inputElement.value = '';
  }

  private refreshDraft(): void {
    this.draftRevision.update((value) => value + 1);
  }

  private findOption(name: string): SkillOption | undefined {
    return this.skillOptions().find(
      (skill) => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
  }

  private applySkillImageDraft(icon: string): void {
    const draftName = this.skillInput.value.trim();
    if (!draftName) return;

    const selectedOption = this.findOption(draftName);
    const skillName = selectedOption?.name ?? draftName;
    let updatedExistingSkill = false;
    const nextSkills = this.selectedSkills().map((skill) => {
      if (skill.name.toLocaleLowerCase() !== skillName.toLocaleLowerCase()) {
        return skill;
      }
      updatedExistingSkill = true;
      return { ...skill, icon };
    });

    if (updatedExistingSkill) {
      this.selectedSkillsChange.emit(nextSkills);
    }

    if (updatedExistingSkill || selectedOption) {
      this.store.rememberUserSkill({ name: skillName, icon });
    }
  }
}
