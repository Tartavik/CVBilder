import { Component, computed, input } from '@angular/core';
import {
  AdditionalSectionItem,
  getAdditionalSectionLabel,
} from '../additional-sections';

interface AdditionalSectionGroup {
  key: string;
  title: string;
  items: AdditionalSectionItem[];
}

@Component({
  selector: 'app-additional-sections-preview',
  standalone: true,
  templateUrl: './additional-sections-preview.component.html',
  styleUrl: './additional-sections-preview.component.scss',
})
export class AdditionalSectionsPreviewComponent {
  readonly items = input.required<AdditionalSectionItem[]>();
  readonly variant = input<'single' | 'classic'>('single');

  readonly groups = computed<AdditionalSectionGroup[]>(() => {
    const groups = new Map<string, AdditionalSectionGroup>();

    this.items().forEach((item) => {
      const customTitle = item.sectionTitle.trim();
      const key =
        item.type === 'custom'
          ? `custom:${customTitle.toLocaleLowerCase()}`
          : item.type;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
        return;
      }
      groups.set(key, {
        key,
        title:
          item.type === 'custom'
            ? customTitle || 'Custom section'
            : getAdditionalSectionLabel(item.type),
        items: [item],
      });
    });

    return [...groups.values()];
  });

  dateRange(item: AdditionalSectionItem): string {
    if (item.startDate && item.endDate) {
      return `${item.startDate} — ${item.endDate}`;
    }
    return item.startDate || item.endDate;
  }
}
