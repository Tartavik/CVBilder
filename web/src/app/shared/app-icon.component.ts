import { Component, computed, input } from '@angular/core';

export type AppIconName =
  | 'add'
  | 'add_circle'
  | 'cancel'
  | 'close'
  | 'delete'
  | 'edit'
  | 'hourglass_empty'
  | 'home'
  | 'logout'
  | 'dark_mode'
  | 'light_mode'
  | 'person'
  | 'person_add'
  | 'picture_as_pdf'
  | 'save'
  | 'search'
  | 'settings'
  | 'visibility';

const ICON_PATHS: Record<AppIconName, string[]> = {
  add: ['M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'],
  add_circle: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  ],
  cancel: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
  ],
  close: [
    'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.7 4.29 4.29 10.59 10.59 16.89 4.29 18.3 5.71z',
  ],
  delete: [
    'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm3.46-7.12 1.41-1.41L12 11.59l1.12-1.12 1.41 1.41L13.41 13l1.12 1.12-1.41 1.41L12 14.41l-1.12 1.12-1.41-1.41L10.59 13l-1.13-1.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z',
  ],
  edit: [
    'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  ],
  hourglass_empty: [
    'M6 2v6h.01L10 12l-3.99 4.01L6 22h12v-5.99L14 12l3.99-4.01L18 2H6zm10 15v3H8v-3l4-4 4 4zm-4-6-4-4V4h8v3l-4 4z',
  ],
  home: [
    'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z',
  ],
  logout: [
    'M5 5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H5V5zm12 2-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5-5-5z',
  ],
  dark_mode: [
    'M12.1 22C6.57 22 2.1 17.52 2.1 12c0-4.21 2.61-7.82 6.3-9.29.46-.18.89.28.71.74A8 8 0 0 0 19.35 13.7c.46-.18.92.25.74.71A10 10 0 0 1 12.1 22z',
  ],
  light_mode: [
    'M6.76 4.84 5.34 3.42 3.93 4.83l1.42 1.42 1.41-1.41zM1 13h3v-2H1v2zm10-12v3h2V1h-2zm9.07 3.84-1.41-1.41-1.42 1.41 1.42 1.41 1.41-1.41zM17.24 19.16l1.42 1.42 1.41-1.41-1.41-1.42-1.42 1.41zM20 11v2h3v-2h-3zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-1 17h2v-3h-2v3zM3.93 19.17l1.41 1.41 1.42-1.42-1.41-1.41-1.42 1.42z',
  ],
  person: [
    'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  ],
  person_add: [
    'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4 1.79-4 4 1.79 4 4 4zM6 10V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  ],
  picture_as_pdf: [
    'M20 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-9 9.5A1.5 1.5 0 0 1 9.5 13H9v2H7.5V9H9.5a1.5 1.5 0 0 1 1.5 1.5v1zm5 2A1.5 1.5 0 0 1 14.5 15H12V9h2.5a1.5 1.5 0 0 1 1.5 1.5v3zm4-3h-2v1h1.5V13H18v2h-1.5V9H20v1.5zM9 10.5v1h.5v-1H9zm4.5 0v3h1v-3h-1z',
  ],
  save: [
    'M17 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-10H5V5h10v4z',
  ],
  search: [
    'M9.5 3a6.5 6.5 0 1 0 4.03 11.6L19.94 21 21 19.94l-6.4-6.41A6.5 6.5 0 0 0 9.5 3zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z',
  ],
  settings: [
    'M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.28 7.28 0 0 0-1.69-.98L14.5 2.42A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42L9.12 5.07c-.61.24-1.18.56-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.06.65-.06.98s.02.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.13.22.39.31.61.22l2.49-1c.51.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.61-.25 1.18-.58 1.69-.98l2.49 1c.22.09.48 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z',
  ],
  visibility: [
    'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  ],
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      @for (path of paths(); track path) {
        <path [attr.d]="path" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: var(--app-icon-size);
      height: var(--app-icon-size);
      flex: 0 0 auto;
      vertical-align: middle;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: currentColor;
    }
  `,
})
export class AppIconComponent {
  readonly name = input.required<AppIconName>();
  readonly paths = computed(() => ICON_PATHS[this.name()]);
}
