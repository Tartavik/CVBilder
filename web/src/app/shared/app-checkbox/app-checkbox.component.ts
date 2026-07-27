import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextCheckboxId = 0;

@Component({
  selector: 'app-checkbox',
  standalone: true,
  templateUrl: './app-checkbox.component.html',
  styleUrl: './app-checkbox.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCheckboxComponent),
      multi: true,
    },
  ],
})
export class AppCheckboxComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly checked = signal(false);
  readonly disabled = signal(false);
  readonly hintId = `app-checkbox-hint-${nextCheckboxId++}`;

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: boolean | null): void {
    this.checked.set(Boolean(value));
  }

  registerOnChange(callback: (value: boolean) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  updateChecked(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.checked.set(inputElement.checked);
    this.onChange(inputElement.checked);
  }

  markTouched(): void {
    this.onTouched();
  }
}
