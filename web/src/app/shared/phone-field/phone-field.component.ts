import { Component, computed, input } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import IntlTelInput from '@intl-tel-input/angular';
import type { Iso2 } from 'intl-tel-input';
import { uk as ukrainianPhoneTranslations } from 'intl-tel-input/locale';
import { FieldErrorDirective } from '../field-error.directive';
import { loadPhoneUtils } from './phone-utils';

let nextPhoneFieldId = 0;

@Component({
  selector: 'app-phone-field',
  standalone: true,
  imports: [ReactiveFormsModule, IntlTelInput, FieldErrorDirective],
  templateUrl: './phone-field.component.html',
  styleUrl: './phone-field.component.scss',
})
export class PhoneFieldComponent {
  readonly control = input.required<AbstractControl | null>();
  readonly formControl = computed(() => {
    const control = this.control();
    return control instanceof FormControl ? control : null;
  });

  readonly phoneInputId = `phone-${nextPhoneFieldId++}`;
  readonly phoneErrorId = `${this.phoneInputId}-error`;
  readonly phoneInputAttributes = {
    id: this.phoneInputId,
    name: 'phone',
    inputmode: 'tel',
    autocomplete: 'tel',
    'aria-label': 'Phone number',
    'aria-describedby': this.phoneErrorId,
  };
  readonly preferredCountries: Iso2[] = ['ua', 'us', 'pl', 'gb', 'de'];
  readonly ukrainianPhoneTranslations = ukrainianPhoneTranslations;
  readonly loadUtils = loadPhoneUtils;

  showError(): boolean {
    const control = this.formControl();
    return Boolean(control?.invalid && control.touched);
  }
}
