import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ErrorService } from './shared/errors/error.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly errors = inject(ErrorService);
}
