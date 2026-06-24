import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CvExportService } from '../cv-export.service';
import { CvSection, CvStore, CvTemplate } from '../cv.store';
import { AuthService } from '../../auth.service';
import { CvEditorFormComponent } from './cv-editor-form.component';
import { CvEditorPreviewPaneComponent } from './cv-editor-preview-pane.component';
import { CvEditorSidebarComponent } from './cv-editor-sidebar.component';

type SaveToast = {
  kind: 'success' | 'error';
  message: string;
};

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
  readonly saveToast = signal<SaveToast | null>(null);
  private saveToastTimer: ReturnType<typeof setTimeout> | null = null;

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
    const saveStarted = this.store.saveToDB(
      this.userId,
      this.cvId,
      () => this.showToast('success', 'CV saved'),
      () => this.showToast('error', 'Could not save CV'),
    );
    if (!saveStarted) {
      this.showToast('error', 'Could not save CV');
    }
  }

  logout(): void {
    this.auth.logout();
  }

  exportPdf(): void {
    this.cvExport.exportPdf(this.cv().template);
  }

  private showToast(kind: SaveToast['kind'], message: string): void {
    if (this.saveToastTimer) {
      clearTimeout(this.saveToastTimer);
    }
    this.saveToast.set({ kind, message });
    this.saveToastTimer = setTimeout(() => {
      this.saveToast.set(null);
      this.saveToastTimer = null;
    }, 2000);
  }
}
