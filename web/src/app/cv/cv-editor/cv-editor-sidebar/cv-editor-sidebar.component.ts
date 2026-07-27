import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { CvSection, CvStore } from '../../cv.store';

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
  readonly deleting = input(false);
  readonly publicationChanging = input(false);
  readonly activeSectionChange = output<CvSection['id']>();
  readonly save = output<void>();
  readonly publish = output<void>();
  readonly unpublish = output<void>();
  readonly deleteCv = output<void>();
  readonly exportPdf = output<void>();
  readonly logout = output<void>();

  readonly cv = this.store.cv;
  readonly saving = this.store.loading;
  readonly isDraft = this.store.isDraft;
  readonly isPublished = this.store.isPublished;
  readonly invalidSections = this.store.invalidSections;

  readonly sectionsOpen = signal(true);
  readonly actionsOpen = signal(true);

  readonly singleDraggableSections = computed<CvSection['id'][]>(() =>
    this.cv().sectionOrder.filter((id) => id !== 'details'),
  );

  readonly classicDraggableSections = computed<CvSection['id'][]>(() =>
    this.cv().sectionOrder.filter((id) => id !== 'details' && id !== 'skills'),
  );

  readonly orderedSections = computed(() =>
    this.getSections(
      this.cv().template === 'classic'
        ? this.classicDraggableSections()
        : this.singleDraggableSections(),
    ),
  );

  private getSections(ids: CvSection['id'][]): CvSection[] {
    return ids
      .map((id) => this.store.sections.find((section) => section.id === id))
      .filter((section): section is CvSection => Boolean(section));
  }

  setActive(sectionId: CvSection['id']): void {
    this.activeSectionChange.emit(sectionId);
  }

  isInvalid(sectionId: CvSection['id']): boolean {
    return this.invalidSections().has(sectionId);
  }

  onDropSections(event: CdkDragDrop<CvSection['id'][]>): void {
    let order: CvSection['id'][] = [];
    const nonDraggableSections: CvSection['id'][] = ['details'];

    if (this.store.cv().template === 'single') {
      order = [...this.singleDraggableSections()];
    } else {
      order = [...this.classicDraggableSections()];
      nonDraggableSections.push('skills');
    }

    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.store.updateSectionOrder(
      this.withNonDraggableSections(order, nonDraggableSections),
    );
  }

  private withNonDraggableSections(
    visibleOrder: CvSection['id'][],
    hiddenSections: CvSection['id'][],
  ): CvSection['id'][] {
    return [
      ...visibleOrder,
      ...hiddenSections.filter((id) => !visibleOrder.includes(id)),
    ];
  }
}
