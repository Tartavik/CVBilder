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
  readonly patternMessage = input('Use letters and common symbols only');

  readonly formControl = computed(() => {
    const control = this.control();
    return control instanceof FormControl ? control : null;
  });
}
