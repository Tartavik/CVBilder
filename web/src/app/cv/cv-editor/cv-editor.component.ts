import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppIconComponent } from '../../shared/app-icon.component';
import { CvSection, CvStore, CvTemplate } from '../cv.store';
import { CvExportService } from '../cv-export.service';
import { PersonalSectionComponent } from '../sections/personal-section/personal-section.component';
import { PersonalDetailsSectionComponent } from '../sections/personal-details-section/personal-details-section.component';
import { PersonalMainSectionComponent } from '../sections/personal-main-section/personal-main-section.component';
import { ExperienceSectionComponent } from '../sections/experience-section/experience-section.component';
import { EducationSectionComponent } from '../sections/education-section/education-section.component';
import { GeneralSkillsSectionComponent } from '../sections/general-skills-section/general-skills-section.component';
import { CvPreviewComponent } from '../cv-preview/cv-preview.component';
import { CvPreviewClassicComponent } from '../cv-preview-classic/cv-preview-classic.component';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-cv-editor',
  standalone: true,
  imports: [
    DragDropModule,
    MatButtonModule,
    RouterLink,
    AppIconComponent,
    PersonalSectionComponent,
    PersonalDetailsSectionComponent,
    PersonalMainSectionComponent,
    ExperienceSectionComponent,
    EducationSectionComponent,
    GeneralSkillsSectionComponent,
    CvPreviewComponent,
    CvPreviewClassicComponent,
  ],
  templateUrl: './cv-editor.component.html',
  styleUrl: './cv-editor.component.scss',
})
export class CvEditorComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cvExport = inject(CvExportService);
  private userId = '';

  readonly cvId = this.route.snapshot.paramMap.get('cvId') ?? '';

  readonly cv = this.store.cv;
  readonly saving = this.store.loading;
  readonly ready = this.store.ready;
  readonly error = this.store.error;
  readonly activeSection = signal<CvSection['id']>('personal');
  readonly saveSuccess = signal(false);

  readonly orderedSections = computed(() =>
    this.getSections(this.cv().sectionOrder),
  );

  readonly classicDraggableSections = computed<CvSection['id'][]>(() =>
    this.cv().sectionOrder.filter((id) => id !== 'skills'),
  );

  readonly classicOrderedSections = computed(() =>
    this.getSections(this.classicDraggableSections()),
  );

  readonly activeLabel = computed(
    () =>
      this.store.sections.find(
        (section) => section.id === this.activeSection(),
      )?.label ?? '',
  );

  ngOnInit(): void {
    const userId = this.auth.getCurrentUserId();
    if (!userId) {
      void this.router.navigate(['/login']);
      return;
    }

    if (!this.cvId) {
      void this.router.navigate(['/home']);
      return;
    }

    this.userId = userId;
    this.store.loadFromDB(userId, this.cvId);
  }

  setTemplate(t: CvTemplate) {
    this.store.updateTemplate(t);
    if (t === 'single' && this.activeSection() === 'details') {
      this.activeSection.set('personal');
    }
  }

  onDrop(event: CdkDragDrop<CvSection['id'][]>) {
    const order = [...this.cv().sectionOrder];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.store.updateSectionOrder(order);
  }

  onClassicDrop(event: CdkDragDrop<CvSection['id'][]>) {
    const order = [...this.classicDraggableSections()];
    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.store.updateSectionOrder([...order, 'skills']);
  }

  saveCv(): void {
    this.saveSuccess.set(false);
    this.store.saveToDB(this.userId, this.cvId, () => {
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 2000);
    });
  }

  logout(): void {
    this.auth.logout();
  }

  exportPdf(): void {
    this.cvExport.exportPdf(this.cv().template);
  }

  private getSections(ids: CvSection['id'][]): CvSection[] {
    return ids
      .map((id) =>
        this.store.sections.find((section) => section.id === id),
      )
      .filter((section): section is CvSection => Boolean(section));
  }
}
