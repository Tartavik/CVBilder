import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CvExportService } from '../cv-export.service';
import { CvSection, CvStore, CvTemplate } from '../cv.store';
import { AuthService } from '../../auth.service';
import { CvEditorFormComponent } from './cv-editor-form.component';
import { CvEditorPreviewPaneComponent } from './cv-editor-preview-pane.component';
import { CvEditorSidebarComponent } from './cv-editor-sidebar.component';

@Component({
  selector: 'app-cv-editor',
  standalone: true,
  imports: [
    CvEditorSidebarComponent,
    CvEditorFormComponent,
    CvEditorPreviewPaneComponent,
  ],
  templateUrl: './cv-editor.component.html',
  styleUrl: './cv-editor.component.scss',
})
export class CvEditorComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly cvExport = inject(CvExportService);
  private userId = '';

  readonly cvId = this.route.snapshot.paramMap.get('cvId') ?? '';

  readonly cv = this.store.cv;
  readonly ready = this.store.ready;
  readonly activeSection = signal<CvSection['id']>('personal');
  readonly saveSuccess = signal(false);

  ngOnInit(): void {
    const userId = this.auth.getCurrentUserId() as string;
    this.userId = userId;
    this.store.loadFromDB(userId, this.cvId);
  }

  setTemplate(t: CvTemplate) {
    this.store.updateTemplate(t);
    if (t === 'single' && this.activeSection() === 'details') {
      this.activeSection.set('personal');
    }
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
}
