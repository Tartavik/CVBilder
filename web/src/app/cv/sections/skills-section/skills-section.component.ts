import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CvStore } from '../../cv.store';

@Component({
  selector: 'app-skills-section',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatChipsModule, MatIconModule],
  templateUrl: './skills-section.component.html',
})
export class SkillsSectionComponent {
  private readonly store = inject(CvStore);
  readonly skills = computed(() => this.store.cv().skills);

  readonly newSkill = new FormControl('');

  add() {
    const skill = this.newSkill.value?.trim() ?? '';
    if (!skill || this.skills().includes(skill)) return;
    this.store.updateSkills([...this.skills(), skill]);
    this.newSkill.reset();
  }

  remove(skill: string) {
    this.store.updateSkills(this.skills().filter((s) => s !== skill));
  }
}
