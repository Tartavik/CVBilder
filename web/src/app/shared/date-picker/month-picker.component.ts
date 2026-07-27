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
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { APP_MONTH_FORMATS } from './date-formats';

@Component({
  selector: 'app-month-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  providers: [
    provideNativeDateAdapter(APP_MONTH_FORMATS),
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
  ],
  templateUrl: './month-picker.component.html',
  styleUrl: './date-picker.component.scss',
})
export class MonthPickerComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly label = input.required<string>();
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);

  readonly formControl = computed(() => {
    const control = this.control();
    return control instanceof FormControl ? control : null;
  });

  selectMonth(date: Date, picker: MatDatepicker<Date>): void {
    const control = this.formControl();
    if (!control) return;

    control.setValue(new Date(date.getFullYear(), date.getMonth(), 1));
    control.markAsDirty();
    control.markAsTouched();
    picker.close();
  }
}
