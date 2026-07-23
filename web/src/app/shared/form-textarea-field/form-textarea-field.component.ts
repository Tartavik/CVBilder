import { Component, computed, input } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldErrorDirective } from '../field-error.directive';

@Component({
  selector: 'app-form-textarea-field',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    FieldErrorDirective,
  ],
  templateUrl: './form-textarea-field.component.html',
  styleUrl: './form-textarea-field.component.scss',
})
export class FormTextareaFieldComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly rows = input(3);
  readonly maxLength = input(500);

  readonly formControl = computed(() => {
    const control = this.control();
    return control instanceof FormControl ? control : null;
  });

  characterCount(control: FormControl): number {
    return `${control.value ?? ''}`.length;
  }
}
