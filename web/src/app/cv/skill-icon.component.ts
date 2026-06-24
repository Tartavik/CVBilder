import { Component, computed, input } from '@angular/core';
import { getSkillOption } from './skill-catalog';

@Component({
  selector: 'app-skill-icon',
  standalone: true,
  template: `
    <span
      class="skill-icon"
      [style.background]="option().color"
      [attr.title]="name()"
      [attr.aria-label]="name()"
      role="img"
    >
      @if (imageSrc()) {
        <img [src]="imageSrc()" [alt]="name()" />
      } @else {
        {{ option().label }}
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .skill-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 0.45rem;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 0.72rem;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.03em;
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / 22%);
      overflow: hidden;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class SkillIconComponent {
  readonly name = input.required<string>();
  readonly icon = input<string | null>();
  readonly option = computed(() => getSkillOption(this.icon(), this.name()));
  readonly imageSrc = computed(() =>
    this.icon()?.startsWith('data:image/') ? this.icon() : null,
  );
}
