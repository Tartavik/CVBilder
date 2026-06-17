import { Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';
import { AppIconComponent } from '../../../shared/app-icon.component';
import {
  CvStore,
  ExperienceItem,
  ExperienceSkill,
  ExperienceSkillMode,
} from '../../cv.store';
import {
  findSkillOptionByName,
  SKILL_OPTIONS,
  SkillOption,
} from '../../skill-catalog';
import { SkillIconComponent } from '../../skill-icon.component';

@Component({
  selector: 'app-experience-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    AppIconComponent,
    SkillIconComponent,
    MatCheckboxModule,
    MatChipsModule,
  ],
  templateUrl: './experience-section.component.html',
})
export class ExperienceSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormArray<FormGroup>([]);
  readonly skillInputs = new FormArray<FormControl<string>>([]);
  readonly skillMode = computed(() => this.store.cv().experienceSkillMode);
  readonly skillOptions = SKILL_OPTIONS;

  get groups(): FormGroup[] {
    return this.form.controls as FormGroup[];
  }

  ngOnInit() {
    this.store.cv().experience.forEach((item) => {
      this.form.push(this.createGroup(item), { emitEvent: false });
      this.skillInputs.push(new FormControl('', { nonNullable: true }));
    });

    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((values: Partial<ExperienceItem>[]) => {
        const ids = this.store.cv().experience.map((e) => e.id);
        values.forEach((v, i) => {
          if (ids[i]) this.store.updateExperience(ids[i], v);
        });
      });
  }

  private createGroup(item?: Partial<ExperienceItem>): FormGroup {
    return new FormGroup({
      company:     new FormControl(item?.company     ?? ''),
      position:    new FormControl(item?.position    ?? ''),
      startDate:   new FormControl(item?.startDate   ?? ''),
      endDate:     new FormControl(item?.endDate     ?? ''),
      current:     new FormControl(item?.current     ?? false),
      description: new FormControl(item?.description ?? ''),
      skills:      new FormControl(item?.skills      ?? []),
    });
  }

  add() {
    this.store.addExperience();
    const items = this.store.cv().experience;
    const newItem = items[items.length - 1];
    this.form.push(this.createGroup(newItem), { emitEvent: false });
    this.skillInputs.push(new FormControl('', { nonNullable: true }));
  }

  remove(index: number) {
    const id = this.store.cv().experience[index].id;
    this.store.removeExperience(id);
    this.form.removeAt(index, { emitEvent: false });
    this.skillInputs.removeAt(index);
  }

  skillsAt(index: number): ExperienceSkill[] {
    return this.groups[index].get('skills')?.value ?? [];
  }

  addSkill(index: number): void {
    const input = this.skillInputs.at(index);
    const skill = input.value.trim();
    const skills = this.skillsAt(index);
    if (
      !skill ||
      skills.some(
        (existingSkill) =>
          existingSkill.name.toLocaleLowerCase() === skill.toLocaleLowerCase(),
      )
    ) {
      return;
    }

    const option = findSkillOptionByName(skill);
    this.groups[index].get('skills')?.setValue([
      ...skills,
      { name: skill, icon: option?.icon ?? null },
    ]);
    input.reset();
  }

  addIconSkill(index: number, option: SkillOption): void {
    if (this.isSkillSelected(index, option.name)) return;

    this.groups[index].get('skills')?.setValue([
      ...this.skillsAt(index),
      { name: option.name, icon: option.icon },
    ]);
  }

  isSkillSelected(index: number, name: string): boolean {
    return this.skillsAt(index).some(
      (skill) => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
  }

  removeSkill(index: number, skill: ExperienceSkill): void {
    this.groups[index]
      .get('skills')
      ?.setValue(this.skillsAt(index).filter((item) => item.name !== skill.name));
  }

  setSkillMode(mode: ExperienceSkillMode): void {
    if (mode === 'icons') {
      this.groups.forEach((group) => {
        const skills = (group.get('skills')?.value ?? []) as ExperienceSkill[];
        group.get('skills')?.setValue(
          skills.map((skill) => ({
            ...skill,
            icon:
              skill.icon ??
              findSkillOptionByName(skill.name)?.icon ??
              null,
          })),
        );
      });
    }
    this.store.updateExperienceSkillMode(mode);
  }
}
