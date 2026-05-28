import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { Ui } from '@cvbilder/ui';

@Component({
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    Ui,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly projectName = 'CV Bilder';
  protected readonly sampleForm = new FormGroup({
    name: new FormControl(''),
  });

  protected saveDraft(): void {
    console.log('Draft payload:', this.sampleForm.value);
  }
}
