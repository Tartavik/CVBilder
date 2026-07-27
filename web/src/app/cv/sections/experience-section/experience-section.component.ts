import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { AppCheckboxComponent } from '../../../shared/app-checkbox/app-checkbox.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { DatePickerComponent } from '../../../shared/date-picker/date-picker.component';
import { FormTextFieldComponent } from '../../../shared/form-text-field/form-text-field.component';
import { FormTextareaFieldComponent } from '../../../shared/form-textarea-field/form-textarea-field.component';
import {
  CvStore,
  ExperienceItem,
  ExperienceSkill,
  ExperienceSkillMode,
} from '../../cv.store';
import { findSkillOptionByName } from '../../skill-catalog';
import { SkillSelectorComponent } from '../../skill-selector/skill-selector.component';
import { createExperienceGroup, toExperiencePatch } from './experience-form';

@Component({
  selector: 'app-experience-section',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    AppIconComponent,
    DatePickerComponent,
    FormTextFieldComponent,
    FormTextareaFieldComponent,
    SkillSelectorComponent,
    AppCheckboxComponent,
  ],
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
  readonly groups = signal<FormGroup[]>([]);
  readonly skillMode = computed(() => this.store.cv().experienceSkillMode);
  readonly reusableExperiences = computed(() =>
    this.store.reusableExperiences(),
  );
  readonly reusableSelection = new FormControl<string | null>(null);

  ngOnInit() {
    this.store.cv().experience.forEach((item) => {
      this.form.push(createExperienceGroup(item, this.destroyRef), {
        emitEvent: false,
      });
    });
    this.syncGroups();

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((values: Partial<ExperienceItem>[]) => {
        const ids = this.store.cv().experience.map((e) => e.id);
        values.forEach((v, i) => {
          if (ids[i]) this.store.updateExperience(ids[i], toExperiencePatch(v));
        });
      });
  }

  add() {
    this.appendExperience();
  }

  addReusableExperience(id: string | null): void {
    const source = this.reusableExperiences().find((item) => item.id === id);
    if (!source) return;
    this.appendExperience(source);
    this.reusableSelection.reset(null, { emitEvent: false });
  }

  private appendExperience(source?: Partial<ExperienceItem>): void {
    this.store.addExperience(source);
    const items = this.store.cv().experience;
    const newItem = items[items.length - 1];
    this.form.push(createExperienceGroup(newItem, this.destroyRef), {
      emitEvent: false,
    });
    this.syncGroups();
    if (this.store.validationAttempt() > 0) {
      this.form.at(this.form.length - 1).markAllAsTouched();
    }
  }

  remove(index: number) {
    const id = this.store.cv().experience[index]?.id;
    const group = this.form.at(index);
    if (!id || !group) return;

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
      this.store.removeExperience(id);
      const currentIndex = this.form.controls.indexOf(group);
      if (currentIndex === -1) return;
      this.form.removeAt(currentIndex, { emitEvent: false });
      this.syncGroups();
    });
  }

  skillsAt(index: number): ExperienceSkill[] {
    return this.groups()[index].get('skills')?.value ?? [];
  }

  updateSkills(index: number, skills: ExperienceSkill[]): void {
    this.groups()[index].get('skills')?.setValue(skills);
  }

  setSkillMode(mode: ExperienceSkillMode): void {
    if (mode === 'icons') {
      this.groups().forEach((group) => {
        const skills = (group.get('skills')?.value ?? []) as ExperienceSkill[];
        group.get('skills')?.setValue(
          skills.map((skill) => ({
            ...skill,
            icon: skill.icon ?? findSkillOptionByName(skill.name)?.icon ?? null,
          })),
        );
      });
    }
    this.store.updateExperienceSkillMode(mode);
  }

  private syncGroups(): void {
    this.groups.set([...this.form.controls] as FormGroup[]);
  }
}
