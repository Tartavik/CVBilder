import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, output } from '@angular/core';
import { CvSection, CvStore } from '../cv.store';

@Component({
  selector: 'app-cv-editor-sidebar',
  standalone: true,
  imports: [DragDropModule],
  templateUrl: './cv-editor-sidebar.component.html',
  styleUrl: './cv-editor-sidebar.component.scss',
})
export class CvEditorSidebarComponent {
  private readonly store = inject(CvStore);

  readonly activeSection = input.required<CvSection['id']>();
  readonly activeSectionChange = output<CvSection['id']>();
  readonly cv = this.store.cv;

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
