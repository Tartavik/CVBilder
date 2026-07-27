import { Component, computed, input } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FieldErrorDirective } from '../field-error.directive';
import { APP_DATE_FORMATS } from './date-formats';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    FieldErrorDirective,
  ],
  providers: [
    provideNativeDateAdapter(APP_DATE_FORMATS),
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
})
export class DatePickerComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly label = input.required<string>();
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);

  readonly formControl = computed(() => {
    const control = this.control();
    return control instanceof FormControl ? control : null;
  });
}
