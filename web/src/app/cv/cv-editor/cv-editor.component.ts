import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
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
import { Observable, map, take, tap } from 'rxjs';
import type { PendingChangesAware } from './pending-changes.guard';

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
export class CvEditorComponent implements OnInit, PendingChangesAware {
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
  readonly publicationChanging = signal(false);
  private saveToastTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const userId = this.auth.getCurrentUserId() as string;
    this.userId = userId;
    this.theme.load().subscribe({
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
    const wasPublished = this.store.isPublished();
    const saveStarted = this.store.saveToDB(
      this.userId,
      this.cvId,
      (savedCvId) => {
        if (wasDraft) {
          this.router.navigate(['/cv', savedCvId, 'edit'], {
            replaceUrl: true,
          });
        }
        this.showToast(
          'success',
          wasPublished && !this.store.isPublished()
            ? 'Draft saved. The incomplete CV was unpublished.'
            : this.store.isPublished()
              ? 'CV saved'
              : 'Draft saved',
        );
      },
      (message) => {
        this.openFirstInvalidSection();
        this.showToast('error', message);
      },
    );
    if (!saveStarted) {
      this.openFirstInvalidSection();
      this.showToast('error', this.store.error() ?? 'Could not save CV');
    }
  }

  logout(): void {
    const canLeave = this.canDeactivate();
    if (typeof canLeave === 'boolean') {
      if (canLeave) this.auth.logout();
      return;
    }
    canLeave.pipe(take(1)).subscribe((confirmed) => {
      if (confirmed) this.auth.logout();
    });
  }

  canDeactivate(): boolean | Observable<boolean> {
    if (!this.store.hasUnsavedChanges()) return true;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      maxWidth: 'calc(100vw - 24px)',
      autoFocus: false,
      data: {
        title: 'Discard unsaved changes?',
        message:
          'You have unsaved changes. If you leave the editor, all unsaved data will be lost.',
        confirmText: 'Leave editor',
        cancelText: 'Stay',
      },
    });

    return dialogRef.afterClosed().pipe(
      take(1),
      map((confirmed) => confirmed === true),
      tap((confirmed) => {
        if (confirmed) this.store.markCurrentStateAsSaved();
      }),
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.store.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  exportPdf(): void {
    if (!this.store.validateForReadyAction()) {
      this.openFirstInvalidSection();
      this.showToast(
        'error',
        this.store.error() ?? 'Complete the CV before exporting it',
      );
      return;
    }
    this.cvExport.exportPdf(this.cv().template);
  }

  publishCv(): void {
    if (this.publicationChanging() || !this.store.validateForReadyAction()) {
      this.openFirstInvalidSection();
      if (!this.publicationChanging()) {
        this.showToast(
          'error',
          this.store.error() ?? 'Complete the CV before publishing it',
        );
      }
      return;
    }

    const wasDraft = this.store.isDraft();
    this.publicationChanging.set(true);
    this.store.saveToDB(
      this.userId,
      this.cvId,
      (savedCvId) => {
        this.store.setPublication(
          this.userId,
          savedCvId,
          true,
          () => {
            this.publicationChanging.set(false);
            if (wasDraft) {
              this.router.navigate(['/cv', savedCvId, 'edit'], {
                replaceUrl: true,
              });
            }
            this.showToast('success', 'CV published');
          },
          (message) => {
            this.publicationChanging.set(false);
            this.openFirstInvalidSection();
            this.showToast('error', message);
          },
        );
      },
      (message) => {
        this.publicationChanging.set(false);
        this.openFirstInvalidSection();
        this.showToast('error', message);
      },
    );
  }

  unpublishCv(): void {
    if (
      this.store.isDraft() ||
      this.publicationChanging() ||
      !this.store.isPublished()
    ) {
      return;
    }

    this.publicationChanging.set(true);
    this.store.setPublication(
      this.userId,
      this.cvId,
      false,
      () => {
        this.publicationChanging.set(false);
        this.showToast('success', 'CV moved to drafts');
      },
      (message) => {
        this.publicationChanging.set(false);
        this.showToast('error', message);
      },
    );
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
    this.api.deleteCv(this.cvId).subscribe({
      next: () => {
        this.store.markCurrentStateAsSaved();
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
