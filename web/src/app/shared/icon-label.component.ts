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
      gap: 0.5rem;
    }

    app-icon {
      width: 1.2rem;
      height: 1.2rem;
    }
  `,
})
export class IconLabelComponent {
  readonly icon = input.required<AppIconName>();
}
