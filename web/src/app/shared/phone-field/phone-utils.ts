import { Injectable, signal } from '@angular/core';
import type { ItiUtils } from 'intl-tel-input';

export const loadPhoneUtils = () => import('intl-tel-input/utils');

@Injectable({ providedIn: 'root' })
export class PhoneFormatterService {
  private readonly utils = signal<ItiUtils | null>(null);

  constructor() {
    void loadPhoneUtils()
      .then(({ default: utils }) => this.utils.set(utils))
      .catch(() => undefined);
  }

  format(phone: string): string {
    const value = phone.trim();
    if (!value) return '';

    return (
      this.utils()?.formatNumber(value, undefined, 'INTERNATIONAL') || value
    );
  }
}
