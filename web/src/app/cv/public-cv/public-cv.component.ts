import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { AppIconComponent } from '../../shared/app-icon.component';
import { CvStore } from '../cv.store';
import { CvPreviewClassicComponent } from '../cv-preview-classic/cv-preview-classic.component';
import { CvPreviewComponent } from '../cv-preview/cv-preview.component';

@Component({
  selector: 'app-public-cv',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    AppIconComponent,
    CvPreviewComponent,
    CvPreviewClassicComponent,
  ],
  templateUrl: './public-cv.component.html',
  styleUrl: './public-cv.component.scss',
})
export class PublicCvComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(CvStore);
  private readonly auth = inject(AuthService);

  readonly ready = computed(() => this.store.ready());
  readonly error = computed(() => this.store.error());
  readonly metadata = computed(() => this.store.metadata());
  readonly template = computed(() => this.store.cv().template);
  readonly backLink = computed(() =>
    this.auth.getCurrentUserId() ? '/home' : '/login',
  );

  constructor() {
    const cvId = this.route.snapshot.paramMap.get('cvId');
    if (cvId) this.store.loadPublic(cvId);
  }
}
