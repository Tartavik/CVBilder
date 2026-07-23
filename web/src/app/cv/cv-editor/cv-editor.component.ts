import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { CvExportService } from '../cv-export.service';
import { CvSection, CvStore, CvTemplate } from '../cv.store';
import { CvEditorFormComponent } from './cv-editor-form/cv-editor-form.component';
import { CvEditorPreviewPaneComponent } from './cv-editor-preview-pane/cv-editor-preview-pane.component';
import { CvEditorSidebarComponent } from './cv-editor-sidebar/cv-editor-sidebar.component';
import { ThemeService } from '../../shared/theme.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { UsersApiService } from '../../users-api.service';

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
  private readonly router = inject(Router);
  private readonly cvExport = inject(CvExportService);
  private readonly theme = inject(ThemeService);
  private readonly api = inject(UsersApiService);
  private readonly dialog = inject(MatDialog);
  private userId = '';

  readonly cvId = this.route.snapshot.paramMap.get('cvId') ?? '';

  readonly cv = this.store.cv;
  readonly ready = this.store.ready;
  readonly activeSection = signal<CvSection['id']>('personal');
  readonly saveToast = signal<SaveToast | null>(null);
  readonly deleting = signal(false);
  private saveToastTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const userId = this.auth.getCurrentUserId() as string;
    this.userId = userId;
    this.theme.load(userId).subscribe({
      error: () => this.theme.apply('light'),
    });
    if (this.route.snapshot.queryParamMap.get('draft') === '1') {
      const templateParam = this.route.snapshot.queryParamMap.get('template');
      const template: CvTemplate =
        templateParam === 'classic' ? 'classic' : 'single';
      this.store.initializeDraft(userId, this.cvId, template);
    } else {
      this.store.loadFromDB(userId, this.cvId);
    }
  }

  saveCv(): void {
    const wasDraft = this.store.isDraft();
    const saveStarted = this.store.saveToDB(
      this.userId,
      this.cvId,
      (savedCvId) => {
        if (wasDraft) {
          this.router.navigate(['/cv', savedCvId, 'edit'], {
            replaceUrl: true,
          });
        }
        this.showToast('success', 'CV saved');
      },
      (message) => {
        this.openFirstInvalidSection();
        this.showToast('error', message);
      },
    );
    if (!saveStarted) {
      this.openFirstInvalidSection();
      this.showToast(
        'error',
        this.store.error() ?? 'Could not save CV',
      );
    }
  }

  logout(): void {
    this.auth.logout();
  }

  exportPdf(): void {
    this.cvExport.exportPdf(this.cv().template);
  }

  confirmDeleteCv(): void {
    if (this.store.isDraft() || this.deleting()) return;

    const title = this.cv().personal.fullName.trim() || 'this CV';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: 'calc(100vw - 24px)',
      autoFocus: false,
      data: {
        title: 'Delete CV?',
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.deleteCv();
    });
  }

  private deleteCv(): void {
    this.deleting.set(true);
    this.api.deleteCv(this.userId, this.cvId).subscribe({
      next: () => {
        this.router.navigate(['/home'], { replaceUrl: true });
      },
      error: () => {
        this.deleting.set(false);
        this.showToast('error', 'Could not delete CV');
      },
    });
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

  private openFirstInvalidSection(): void {
    const invalidSections = this.store.invalidSections();
    const firstInvalidSection = this.cv().sectionOrder.find((sectionId) =>
      invalidSections.has(sectionId),
    );
    if (firstInvalidSection) {
      this.activeSection.set(firstInvalidSection);
    }
  }
}
