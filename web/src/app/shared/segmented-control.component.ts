import { Component, input, output } from '@angular/core';

export interface SegmentedControlOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-segmented-control',
  standalone: true,
  template: `
    <div class="segmented-control" role="group">
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="segmented-control__button"
          [class.active]="option.value === selected()"
          (click)="selectedChange.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .segmented-control {
      display: flex;
      gap: 4px;
      padding: 3px;
      border-radius: 6px;
      background: #d0d0d0;
    }

    .segmented-control__button {
      padding: 4px 12px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #555;
      cursor: pointer;
      font-size: 0.8rem;
      transition: background 0.15s, color 0.15s;
    }

    .segmented-control__button.active {
      background: white;
      color: #1e1e2e;
      font-weight: 600;
      box-shadow: 0 1px 3px rgb(0 0 0 / 15%);
    }
  `,
})
export class SegmentedControlComponent {
  readonly options = input.required<readonly SegmentedControlOption[]>();
  readonly selected = input.required<string>();
  readonly selectedChange = output<string>();
}
