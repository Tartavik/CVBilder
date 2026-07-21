import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { AppIconComponent } from '../../shared/app-icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [AppIconComponent, RouterLink],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly auth = inject(AuthService);

  readonly isLoggedIn = computed(() => Boolean(this.auth.currentUserId()));
}
