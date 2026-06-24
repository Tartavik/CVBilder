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
      padding: 4px;
      border-radius: var(--app-radius-control);
      background: var(--app-border-strong);
    }

    .segmented-control__button {
      padding: 4px 12px;
      border: none;
      border-radius: var(--app-radius-control);
      background: transparent;
      color: var(--app-muted);
      cursor: pointer;
      font-size: var(--app-font-size-sm);
      transition: background 0.15s, color 0.15s;
    }

    .segmented-control__button.active {
      background: var(--app-surface);
      color: var(--app-title);
      font-weight: 600;
      box-shadow: var(--app-shadow);
    }
  `,
})
export class SegmentedControlComponent {
  readonly options = input.required<readonly SegmentedControlOption[]>();
  readonly selected = input.required<string>();
  readonly selectedChange = output<string>();
}
