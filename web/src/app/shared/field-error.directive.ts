import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { merge } from 'rxjs';

@Directive({
  selector: '[appFieldError]',
  standalone: true,
})
export class FieldErrorDirective {
  readonly control = input.required<AbstractControl | null>();
  readonly requiredMessage = input('Field is required');
  readonly patternMessage = input('Use letters and common symbols only');

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly errorMessages: Array<[string, () => string]> = [
    ['required', () => this.requiredMessage()],
    ['minlength', () => this.getMinLengthMessage()],
    ['maxlength', () => this.getMaxLengthMessage()],
    ['pattern', () => this.patternMessage()],
    ['matDatepickerParse', () => 'Enter a valid date'],
    ['startDateInFuture', () => 'Start date cannot be in the future'],
    ['endDateBeforeStart', () => 'End date cannot be before start date'],
  ];
  private readonly renderMessage = effect((onCleanup) => {
    const control = this.control();
    this.updateMessage();

    if (control) {
      const subscription = merge(control.statusChanges, control.valueChanges).subscribe(
        () => this.updateMessage(),
      );
      onCleanup(() => subscription.unsubscribe());
    }
  });

  private updateMessage(): void {
    this.element.nativeElement.textContent = this.getMessage();
  }

  private getMessage(): string {
    const errors = this.control()?.errors;
    if (!errors) return '';

    const matchedError = this.errorMessages.find(([errorName]) => errors[errorName]);
    return matchedError?.[1]() ?? 'Invalid value';
  }

  private getMinLengthMessage(): string {
    const requiredLength = this.control()?.errors?.['minlength']?.requiredLength;
    return `Use at least ${requiredLength} characters`;
  }

  private getMaxLengthMessage(): string {
    const requiredLength = this.control()?.errors?.['maxlength']?.requiredLength;
    return `Use no more than ${requiredLength} characters`;
  }
}
