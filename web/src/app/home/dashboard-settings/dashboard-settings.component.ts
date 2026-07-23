import { Component, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppIconComponent } from '../../shared/app-icon.component';
import { ThemeMode } from '../../users-api.service';

@Component({
  selector: 'app-dashboard-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    AppIconComponent,
  ],
  templateUrl: './dashboard-settings.component.html',
  styleUrl: './dashboard-settings.component.scss',
})
export class DashboardSettingsComponent {
  readonly theme = input.required<ThemeMode>();
  readonly themeSaving = input.required<boolean>();
  readonly profileSaving = input.required<boolean>();
  readonly profileMessage = input.required<string>();
  readonly profileMessageIsError = input.required<boolean>();
  readonly profileForm = input.required<FormGroup>();
  readonly themeToggle = output<void>();
  readonly profileSave = output<void>();
  readonly logoutClick = output<void>();

  readonly settingsOpen = signal(false);
}
