import { Component, input } from '@angular/core';
import { AppIconComponent, AppIconName } from './app-icon.component';

@Component({
  selector: 'app-icon-label',
  standalone: true,
  imports: [AppIconComponent],
  template: `
    <app-icon [name]="icon()" />
    <span><ng-content /></span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    app-icon {
      width: var(--app-icon-size);
      height: var(--app-icon-size);
    }
  `,
})
export class IconLabelComponent {
  readonly icon = input.required<AppIconName>();
}
