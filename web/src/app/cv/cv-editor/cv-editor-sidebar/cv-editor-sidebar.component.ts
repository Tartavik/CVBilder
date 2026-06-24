import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { CvSection, CvStore, CvTemplate } from '../../cv.store';

@Component({
  selector: 'app-cv-editor-sidebar',
  standalone: true,
  imports: [DragDropModule, RouterLink, AppIconComponent],
  templateUrl: './cv-editor-sidebar.component.html',
  styleUrl: './cv-editor-sidebar.component.scss',
})
export class CvEditorSidebarComponent {
  private readonly store = inject(CvStore);

  readonly activeSection = input.required<CvSection['id']>();
  readonly cvId = input.required<string>();
  readonly activeSectionChange = output<CvSection['id']>();
  readonly templateChange = output<CvTemplate>();
  readonly save = output<void>();
  readonly exportPdf = output<void>();
  readonly logout = output<void>();

  readonly cv = this.store.cv;
  readonly saving = this.store.loading;
  readonly invalidSections = this.store.invalidSections;

  readonly sectionsOpen = signal(true);
  readonly templateOpen = signal(true);
  readonly actionsOpen = signal(true);

  readonly orderedSections = computed(() =>
    this.getSections(this.cv().sectionOrder),
  );

  readonly classicDraggableSections = computed<CvSection['id'][]>(() =>
    this.cv().sectionOrder.filter((id) => id !== 'skills'),
  );

  readonly classicOrderedSections = computed(() =>
    this.getSections(this.classicDraggableSections()),
  );

  setActive(sectionId: CvSection['id']): void {
    this.activeSectionChange.emit(sectionId);
  }

  selectTemplate(template: CvTemplate): void {
    this.templateChange.emit(template);
  }

  isInvalid(sectionId: CvSection['id']): boolean {
    return this.invalidSections().has(sectionId);
  }

  onDrop(event: CdkDragDrop<CvSection['id'][]>): void {
    const order = [...this.cv().sectionOrder];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.store.updateSectionOrder(order);
  }

  onClassicDrop(event: CdkDragDrop<CvSection['id'][]>): void {
    const order = [...this.classicDraggableSections()];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.store.updateSectionOrder([...order, 'skills']);
  }

  private getSections(ids: CvSection['id'][]): CvSection[] {
    return ids
      .map((id) =>
        this.store.sections.find((section) => section.id === id),
      )
      .filter((section): section is CvSection => Boolean(section));
  }
}
