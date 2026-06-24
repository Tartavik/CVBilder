import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AppIconComponent } from '../app-icon.component';

@Component({
  selector: 'app-profile-photo-field',
  standalone: true,
  imports: [MatButtonModule, AppIconComponent],
  templateUrl: './profile-photo-field.component.html',
})
export class ProfilePhotoFieldComponent {
  readonly photo = input('');
  readonly uploading = input(false);
  readonly upload = output<File>();
  readonly remove = output<void>();

  onPhotoChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) return;
    this.upload.emit(file);
    inputElement.value = '';
  }
}
