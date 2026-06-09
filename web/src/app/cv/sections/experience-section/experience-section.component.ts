import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';
import { CvStore, ExperienceItem } from '../../cv.store';

@Component({
  selector: 'app-experience-section',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule],
  templateUrl: './experience-section.component.html',
})
export class ExperienceSectionComponent implements OnInit {
  private readonly store = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormArray<FormGroup>([]);

  get groups(): FormGroup[] {
    return this.form.controls as FormGroup[];
  }

  ngOnInit() {
    this.store.cv().experience.forEach((item) =>
      this.form.push(this.createGroup(item), { emitEvent: false })
    );

    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((values: Partial<ExperienceItem>[]) => {
        const ids = this.store.cv().experience.map((e) => e.id);
        values.forEach((v, i) => {
          if (ids[i]) this.store.updateExperience(ids[i], v);
        });
      });
  }

  private createGroup(item?: Partial<ExperienceItem>): FormGroup {
    return new FormGroup({
      company:     new FormControl(item?.company     ?? ''),
      position:    new FormControl(item?.position    ?? ''),
      startDate:   new FormControl(item?.startDate   ?? ''),
      endDate:     new FormControl(item?.endDate     ?? ''),
      current:     new FormControl(item?.current     ?? false),
      description: new FormControl(item?.description ?? ''),
    });
  }

  add() {
    this.store.addExperience();
    const items = this.store.cv().experience;
    const newItem = items[items.length - 1];
    this.form.push(this.createGroup(newItem), { emitEvent: false });
  }

  remove(index: number) {
    const id = this.store.cv().experience[index].id;
    this.store.removeExperience(id);
    this.form.removeAt(index, { emitEvent: false });
  }
}
