import { Component, computed, input } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldErrorDirective } from '../field-error.directive';

@Component({
  selector: 'app-form-text-field',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    FieldErrorDirective,
  ],
  templateUrl: './form-text-field.component.html',
  styleUrl: './form-text-field.component.scss',
})
export class FormTextFieldComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly type = input('text');
  readonly min = input<string | number | null>(null);
  readonly max = input<string | number | null>(null);
  readonly maxLength = input<number | null | undefined>(undefined);
  readonly patternMessage = input('Use letters and common symbols only');

  readonly formControl = computed(() => {
    const control = this.control();
    return control instanceof FormControl ? control : null;
  });
  readonly characterLimit = computed(() => {
    const configuredLimit = this.maxLength();
    if (configuredLimit !== undefined) return configuredLimit;

    switch (this.type()) {
      case 'email':
        return 120;
      case 'tel':
        return 16;
      case 'url':
        return 2048;
      case 'number':
      case 'date':
      case 'month':
        return null;
      default:
        return 120;
    }
  });
  readonly nativeMaxLength = computed(() =>
    this.type() === 'tel' ? null : this.characterLimit(),
  );
  readonly showCharacterCounter = computed(
    () => this.type() !== 'tel' && this.characterLimit() !== null,
  );

  characterCount(control: FormControl): number {
    return `${control.value ?? ''}`.length;
  }

  applyPhoneMask(event: Event): void {
    if (this.type() !== 'tel') return;

    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 15);
    const maskedValue = digits ? `+${digits}` : '';
    if (input.value === maskedValue) return;

    input.value = maskedValue;
    this.formControl()?.setValue(maskedValue);
  }
}
