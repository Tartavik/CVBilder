import { Component, DestroyRef, OnInit, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { SHORT_TEXT_PATTERN } from '../../../shared/validation-patterns';
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
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    AppIconComponent,
    SkillIconComponent,
    MatCheckboxModule,
    MatChipsModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './experience-section.component.html',
})
export class ExperienceSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly showValidationErrors = effect(() => {
    if (this.store.validationAttempt() > 0) {
      queueMicrotask(() => {
        this.form.markAllAsTouched();
        this.form.updateValueAndValidity({ emitEvent: false });
      });
    }
  });

  readonly form = new FormArray<FormGroup>([]);
  readonly skillInputs = new FormArray<FormControl<string>>([]);
  readonly skillIconInputs = new FormArray<FormControl<string | null>>([]);
  readonly skillMode = computed(() => this.store.cv().experienceSkillMode);
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

  get groups(): FormGroup[] {
    return this.form.controls as FormGroup[];
  }

  ngOnInit() {
    this.store.cv().experience.forEach((item) => {
      this.form.push(this.createGroup(item), { emitEvent: false });
      this.skillInputs.push(new FormControl('', { nonNullable: true }));
      this.skillIconInputs.push(new FormControl<string | null>(null));
    });

    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((values: Partial<ExperienceItem>[]) => {
        const ids = this.store.cv().experience.map((e) => e.id);
        values.forEach((v, i) => {
          if (ids[i]) this.store.updateExperience(ids[i], this.toExperiencePatch(v));
        });
      });
  }

  private createGroup(item?: Partial<ExperienceItem>): FormGroup {
    const group = new FormGroup({
      company:     new FormControl(item?.company     ?? '', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(SHORT_TEXT_PATTERN),
      ]),
      position:    new FormControl(item?.position    ?? '', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(SHORT_TEXT_PATTERN),
      ]),
      startDate:   new FormControl(this.toDate(item?.startDate), Validators.required),
      endDate:     new FormControl(this.toDate(item?.endDate)),
      current:     new FormControl(item?.current     ?? false),
      description: new FormControl(item?.description ?? '', [
        Validators.required,
        Validators.minLength(2),
      ]),
      skills:      new FormControl(item?.skills      ?? []),
    });

    const currentControl = group.get('current');
    const endDateControl = group.get('endDate');
    const syncEndDateValidators = (current: unknown) => {
      if (current) {
        endDateControl?.clearValidators();
      } else {
        endDateControl?.setValidators([
          Validators.required,
        ]);
      }
      endDateControl?.updateValueAndValidity({ emitEvent: false });
      this.syncDateErrors(group);
    };

    syncEndDateValidators(currentControl?.value);
    currentControl?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(syncEndDateValidators);
    group.get('startDate')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncDateErrors(group));
    group.get('endDate')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncDateErrors(group));

    this.syncDateErrors(group);
    return group;
  }

  hasError(group: FormGroup, controlName: string, errorName: string): boolean {
    return group.get(controlName)?.hasError(errorName) ?? false;
  }

  private toDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDateString(value: unknown): string {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = `${value.getMonth() + 1}`.padStart(2, '0');
      const day = `${value.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return typeof value === 'string' ? value : '';
  }

  private toExperiencePatch(value: Partial<ExperienceItem>): Partial<ExperienceItem> {
    const dates = value as { startDate?: unknown; endDate?: unknown };
    return {
      ...value,
      startDate: this.toDateString(dates.startDate),
      endDate: this.toDateString(dates.endDate),
    };
  }

  private syncDateErrors(group: FormGroup): void {
    const startControl = group.get('startDate');
    const endControl = group.get('endDate');
    const startDate = startControl?.value;
    const endDate = endControl?.value;
    const current = group.get('current')?.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startErrors = { ...(startControl?.errors ?? {}) };
    delete startErrors['startDateInFuture'];
    if (startDate instanceof Date && !Number.isNaN(startDate.getTime())) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (start > today) {
        startErrors['startDateInFuture'] = true;
      }
    }
    startControl?.setErrors(Object.keys(startErrors).length ? startErrors : null);

    const endErrors = { ...(endControl?.errors ?? {}) };
    delete endErrors['endDateBeforeStart'];
    if (
      !current &&
      startDate instanceof Date &&
      endDate instanceof Date &&
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime())
    ) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (end < start) {
        endErrors['endDateBeforeStart'] = true;
      }
    }
    endControl?.setErrors(Object.keys(endErrors).length ? endErrors : null);
  }

  add() {
    this.store.addExperience();
    const items = this.store.cv().experience;
    const newItem = items[items.length - 1];
    this.form.push(this.createGroup(newItem), { emitEvent: false });
    this.skillInputs.push(new FormControl('', { nonNullable: true }));
    this.skillIconInputs.push(new FormControl<string | null>(null));
    if (this.store.validationAttempt() > 0) {
      this.form.at(this.form.length - 1).markAllAsTouched();
    }
  }

  remove(index: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: 'Delete experience?',
        message:
          'Are you sure you want to delete this experience section? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      const id = this.store.cv().experience[index]?.id;
      if (!id) return;
      this.store.removeExperience(id);
      this.form.removeAt(index, { emitEvent: false });
      this.skillInputs.removeAt(index);
      this.skillIconInputs.removeAt(index);
    });
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
    const selectedOption = this.skillOptions().find(
      (item) => item.name.toLocaleLowerCase() === skill.toLocaleLowerCase(),
    );
    const icon =
      this.skillIconInputs.at(index).value ??
      selectedOption?.icon ??
      option?.icon ??
      null;
    const newSkill = { name: selectedOption?.name ?? skill, icon };
    this.groups[index].get('skills')?.setValue([
      ...skills,
      newSkill,
    ]);
    this.store.rememberUserSkill(newSkill);
    input.reset();
    this.skillIconInputs.at(index).reset();
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

  selectSkill(index: number, name: string): void {
    this.skillInputs.at(index).setValue(name);
    const option = this.skillOptions().find(
      (skill) => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    this.skillIconInputs.at(index).setValue(option?.icon ?? null);
  }

  filteredSkillOptions(index: number): SkillOption[] {
    const search = this.skillInputs.at(index).value.trim().toLocaleLowerCase();
    if (!search) return this.skillOptions().slice(0, 8);
    return this.skillOptions()
      .filter((skill) => skill.name.toLocaleLowerCase().includes(search))
      .slice(0, 8);
  }

  selectedSkillPreview(index: number): ExperienceSkill {
    const name = this.skillInputs.at(index).value.trim() || 'Skill';
    return { name, icon: this.skillIconInputs.at(index).value };
  }

  hasSkillDraft(index: number): boolean {
    return Boolean(
      this.skillInputs.at(index).value.trim() || this.skillIconInputs.at(index).value,
    );
  }

  clearSkillDraft(index: number): void {
    this.skillInputs.at(index).reset();
    this.skillIconInputs.at(index).reset();
  }

  onSkillImageChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.skillIconInputs.at(index).setValue(String(reader.result ?? ''));
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearSkillImage(index: number): void {
    this.skillIconInputs.at(index).reset();
  }
}
