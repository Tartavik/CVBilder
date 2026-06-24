import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SHORT_TEXT_PATTERN } from '../../../shared/validation-patterns';
import { ExperienceItem } from '../../cv.store';

export function createExperienceGroup(
  item: Partial<ExperienceItem> | undefined,
  destroyRef: DestroyRef,
): FormGroup {
  const group = new FormGroup({
    company: new FormControl(item?.company ?? '', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    position: new FormControl(item?.position ?? '', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(SHORT_TEXT_PATTERN),
    ]),
    startDate: new FormControl(toDate(item?.startDate), Validators.required),
    endDate: new FormControl(toDate(item?.endDate)),
    current: new FormControl(item?.current ?? false),
    description: new FormControl(item?.description ?? '', [
      Validators.required,
      Validators.minLength(2),
    ]),
    skills: new FormControl(item?.skills ?? []),
  });

  const currentControl = group.get('current');
  const endDateControl = group.get('endDate');
  const syncEndDateValidators = (current: unknown) => {
    if (current) {
      endDateControl?.clearValidators();
    } else {
      endDateControl?.setValidators([Validators.required]);
    }
    endDateControl?.updateValueAndValidity({ emitEvent: false });
    syncDateErrors(group);
  };

  syncEndDateValidators(currentControl?.value);
  currentControl?.valueChanges
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(syncEndDateValidators);
  group
    .get('startDate')
    ?.valueChanges.pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => syncDateErrors(group));
  group
    .get('endDate')
    ?.valueChanges.pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => syncDateErrors(group));

  syncDateErrors(group);
  return group;
}

export function toExperiencePatch(
  value: Partial<ExperienceItem>,
): Partial<ExperienceItem> {
  const dates = value as { startDate?: unknown; endDate?: unknown };
  return {
    ...value,
    startDate: toDateString(dates.startDate),
    endDate: toDateString(dates.endDate),
  };
}

function toDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return typeof value === 'string' ? value : '';
}

function syncDateErrors(group: FormGroup): void {
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
