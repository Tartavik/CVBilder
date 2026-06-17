import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';
import { AppIconComponent } from '../../../shared/app-icon.component';
import { CvStore, EducationItem } from '../../cv.store';

@Component({
  selector: 'app-education-section',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, AppIconComponent],
  templateUrl: './education-section.component.html',
})
export class EducationSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormArray<FormGroup>([]);

  get groups(): FormGroup[] {
    return this.form.controls as FormGroup[];
  }

  ngOnInit() {
    this.store.cv().education.forEach((item) =>
      this.form.push(this.createGroup(item), { emitEvent: false })
    );

    this.form.valueChanges
      .pipe(debounceTime(300),
      takeUntilDestroyed(this.destroyRef))
      .subscribe((values: Partial<EducationItem>[]) => {
        console.log(values, "value changes");
        const ids = this.store.cv().education.map((e) => e.id);
        values.forEach((v, i) => {
          if (ids[i]) this.store.updateEducation(ids[i], v);
        });
      });
  }

  private createGroup(item?: Partial<EducationItem>): FormGroup {
    return new FormGroup({
      institution: new FormControl(item?.institution ?? ''),
      degree:      new FormControl(item?.degree      ?? ''),
      field:       new FormControl(item?.field       ?? ''),
      year:        new FormControl(item?.year        ?? ''),
    });
  }

  add() {
    this.store.addEducation();
    const items = this.store.cv().education;
    const newItem = items[items.length - 1];
    this.form.push(this.createGroup(newItem), { emitEvent: false });
  }

  remove(index: number) {
    const id = this.store.cv().education[index].id;
    this.store.removeEducation(id);
    this.form.removeAt(index, { emitEvent: false });
  }
}
