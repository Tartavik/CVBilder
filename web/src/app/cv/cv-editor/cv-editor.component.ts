import { Component, computed, inject, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CvSection, CvStore, CvTemplate } from '../cv.store';
import { PersonalSectionComponent } from '../sections/personal-section/personal-section.component';
import { PersonalDetailsSectionComponent } from '../sections/personal-details-section/personal-details-section.component';
import { PersonalMainSectionComponent } from '../sections/personal-main-section/personal-main-section.component';
import { ExperienceSectionComponent } from '../sections/experience-section/experience-section.component';
import { EducationSectionComponent } from '../sections/education-section/education-section.component';
import { SkillsSectionComponent } from '../sections/skills-section/skills-section.component';
import { CvPreviewComponent } from '../cv-preview/cv-preview.component';
import { CvPreviewClassicComponent } from '../cv-preview-classic/cv-preview-classic.component';

@Component({
  selector: 'app-cv-editor',
  standalone: true,
  imports: [
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    PersonalSectionComponent,
    PersonalDetailsSectionComponent,
    PersonalMainSectionComponent,
    ExperienceSectionComponent,
    EducationSectionComponent,
    SkillsSectionComponent,
    CvPreviewComponent,
    CvPreviewClassicComponent,
  ],
  templateUrl: './cv-editor.component.html',
  styleUrl: './cv-editor.component.scss',
})
export class CvEditorComponent {
  private readonly store = inject(CvStore);

  readonly sectionOrder = computed(() => this.store.cv().sectionOrder);
  readonly activeSection = signal<string>('personal');
  readonly activeTemplate = computed(() => this.store.cv().template ?? 'single');

  setTemplate(t: CvTemplate) {
    this.store.updateTemplate(t);
    if (t === 'single' && this.activeSection() === 'details') {
      this.activeSection.set('personal');
    }
  }

  // Single template
  readonly orderedSections = computed(() =>
    this.sectionOrder().map((id) => this.store.sections.find((s) => s.id === id)!)
  );

  // Classic template — only right-column sections (no skills)
  readonly classicDraggableSections = computed(() =>
    this.sectionOrder().filter((id) => id !== 'skills') as CvSection['id'][]
  );

  readonly classicOrderedSections = computed(() =>
    this.classicDraggableSections().map((id) => this.store.sections.find((s) => s.id === id)!)
  );

  readonly activeLabel = computed(() => {
    if (this.activeSection() === 'details') return 'Details';
    return this.store.sections.find((s) => s.id === this.activeSection())?.label ?? '';
  });

  onDrop(event: CdkDragDrop<CvSection['id'][]>) {
    const order = [...this.sectionOrder()];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.store.updateSectionOrder(order);
  }

  onClassicDrop(event: CdkDragDrop<CvSection['id'][]>) {
    const order = [...this.classicDraggableSections()];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.store.updateSectionOrder([...order, 'skills']);
  }

  exportPdf(): void {
    const selector = this.activeTemplate() === 'classic' ? 'app-cv-preview-classic' : 'app-cv-preview';
    const previewEl = document.querySelector(selector);
    if (!previewEl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styleTags = Array.from(document.querySelectorAll('style'))
      .map((s) => s.outerHTML)
      .join('\n');

    const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((l) => l.outerHTML)
      .join('\n');

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CV</title>
  ${linkTags}
  ${styleTags}
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; background: white; }
    .preview-page { min-height: auto !important; box-shadow: none !important; }
  </style>
</head>
<body>${previewEl.outerHTML}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
}
