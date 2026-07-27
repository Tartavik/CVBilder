import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppIconComponent } from '../../shared/app-icon.component';
import { CV_FIELD_LIMITS } from '../cv-field-limits';
import { CvStore, ExperienceSkill } from '../cv.store';
import {
  findSkillOptionByName,
  SKILL_OPTIONS,
  SkillOption,
} from '../skill-catalog';
import { SkillIconComponent } from '../skill-icon.component';

const MAX_SKILL_IMAGE_SIZE = 2 * 1024 * 1024;
const SKILL_ICON_SIZE = 128;
const SUPPORTED_SKILL_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

@Component({
  selector: 'app-skill-selector',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    AppIconComponent,
    SkillIconComponent,
  ],
  templateUrl: './skill-selector.component.html',
})
export class SkillSelectorComponent {
  private readonly store = inject(CvStore);

  readonly selectedSkills = input<ExperienceSkill[]>([]);
  readonly showIcons = input(false);
  readonly allowImageUpload = input(false);
  readonly inputLabel = input('Find or add skill');
  readonly placeholder = input('e.g. Angular');
  readonly selectedSkillsChange = output<ExperienceSkill[]>();
  private blurAddTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly duplicateSkillValidator = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const draftName = `${control.value ?? ''}`.trim().toLocaleLowerCase();
    if (!draftName) return null;
    return this.selectedSkills().some(
      (skill) => skill.name.trim().toLocaleLowerCase() === draftName,
    )
      ? { duplicateSkill: true }
      : null;
  };

  readonly skillNameLimit = CV_FIELD_LIMITS.skill;
  readonly skillInput = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.maxLength(CV_FIELD_LIMITS.skill),
      this.duplicateSkillValidator,
    ],
  });
  private readonly revalidateDuplicateSkill = effect(() => {
    this.selectedSkills();
    this.skillInput.updateValueAndValidity({ emitEvent: false });
  });
  readonly draftIcon = signal<string | null>(null);
  readonly draftRevision = signal(0);
  readonly generationState = signal<
    'idle' | 'generating' | 'generated' | 'found' | 'uploaded' | 'error'
  >('idle');
  readonly generationMessage = signal<string | null>(null);
  readonly skillOptions = computed<SkillOption[]>(() => {
    const skills = new Map<string, SkillOption>();
    const hiddenSkills = this.store.hiddenUserSkills();
    SKILL_OPTIONS.forEach((option) => {
      const key = option.name.toLocaleLowerCase();
      if (!hiddenSkills.has(key)) {
        skills.set(key, option);
      }
    });
    this.store.userSkills().forEach((skill) => {
      if (hiddenSkills.has(skill.name.toLocaleLowerCase())) return;
      const catalogOption = findSkillOptionByName(skill.name);
      skills.set(skill.name.toLocaleLowerCase(), {
        name: skill.name,
        icon: skill.icon ?? catalogOption?.icon ?? null,
        label:
          catalogOption?.label ?? skill.name.slice(0, 2).toLocaleUpperCase(),
        color: catalogOption?.color ?? '#2563eb',
      });
    });
    return [...skills.values()].sort((a, b) => a.name.localeCompare(b.name));
  });
  readonly availableSkillOptions = computed(() => {
    const selectedNames = new Set(
      this.selectedSkills().map((skill) => skill.name.toLocaleLowerCase()),
    );
    return this.skillOptions().filter(
      (skill) => !selectedNames.has(skill.name.toLocaleLowerCase()),
    );
  });

  addSkill(): void {
    const draftName = this.skillInput.value.trim();
    if (!draftName || this.skillInput.invalid) return;

    const selectedOption = this.findOption(draftName);
    const catalogOption = findSkillOptionByName(draftName);
    const newSkill = {
      name: selectedOption?.name ?? draftName,
      icon:
        this.draftIcon() ?? selectedOption?.icon ?? catalogOption?.icon ?? null,
    };
    this.selectedSkillsChange.emit([...this.selectedSkills(), newSkill]);
    this.store.rememberUserSkill(newSkill);
    this.clearSkillDraft();
  }

  removeSkill(skill: ExperienceSkill): void {
    this.selectedSkillsChange.emit(
      this.selectedSkills().filter((item) => item.name !== skill.name),
    );
  }

  deleteSkillDraft(): void {
    const draftName = this.skillInput.value.trim();
    if (!draftName) {
      this.clearSkillDraft();
      return;
    }

    const normalizedName = draftName.toLocaleLowerCase();
    this.selectedSkillsChange.emit(
      this.selectedSkills().filter(
        (skill) => skill.name.toLocaleLowerCase() !== normalizedName,
      ),
    );
    this.store.deleteUserSkill(draftName);
    this.clearSkillDraft();
  }

  selectSkill(name: string): void {
    this.skillInput.setValue(name);
    this.draftIcon.set(this.findOption(name)?.icon ?? null);
    this.refreshDraft();
    this.addSkill();
  }

  onSkillInputEnter(
    event: Event,
    autocompleteTrigger: MatAutocompleteTrigger,
  ): void {
    if (autocompleteTrigger.panelOpen && autocompleteTrigger.activeOption) {
      return;
    }

    event.preventDefault();
    this.addSkill();
  }

  filteredSkillOptions(): SkillOption[] {
    this.draftRevision();
    const search = this.skillInput.value.trim().toLocaleLowerCase();
    if (!search) return this.availableSkillOptions().slice(0, 8);
    return this.availableSkillOptions()
      .filter((skill) => skill.name.toLocaleLowerCase().includes(search))
      .slice(0, 8);
  }

  selectedSkillPreview(): ExperienceSkill {
    this.draftRevision();
    const name = this.skillInput.value.trim() || 'Skill';
    return { name, icon: this.draftIcon() };
  }

  hasSkillDraft(): boolean {
    this.draftRevision();
    return Boolean(this.skillInput.value.trim() || this.draftIcon());
  }

  hasSkillImageDraft(): boolean {
    this.draftRevision();
    return Boolean(this.draftIcon());
  }

  clearSkillDraft(): void {
    this.skillInput.reset();
    this.draftIcon.set(null);
    this.generationState.set('idle');
    this.generationMessage.set(null);
    this.refreshDraft();
  }

  clearSkillImage(): void {
    this.draftIcon.set(null);
    this.generationState.set('idle');
    this.generationMessage.set(null);
    this.refreshDraft();
  }

  generateSkillIcon(): void {
    const draftName = this.skillInput.value.trim();
    if (!draftName) return;

    this.generationState.set('generating');
    this.generationMessage.set('Generating icon...');

    this.store.generateSkillIcon(draftName).subscribe({
      next: ({ icon, source }) => {
        this.draftIcon.set(icon);
        this.applySkillImageDraft(icon);
        this.refreshDraft();
        this.generationState.set(source === 'found' ? 'found' : 'generated');
        this.generationMessage.set(
          source === 'found'
            ? 'Found an existing icon for this skill.'
            : 'Generated a new icon for this skill.',
        );
      },
      error: () => {
        this.generationState.set('error');
        this.generationMessage.set(
          'Could not generate an icon right now. Please try again.',
        );
      },
    });
  }

  restartSkillImage(): void {
    this.draftIcon.set(null);
    this.generationState.set('idle');
    this.generationMessage.set(null);
    this.refreshDraft();
  }

  onDraftInput(): void {
    this.skillInput.markAsTouched();
    if (
      this.generationState() !== 'idle' &&
      this.generationState() !== 'generating'
    ) {
      this.generationState.set('idle');
      this.generationMessage.set(null);
    }
    this.refreshDraft();
  }

  onComposerFocusOut(event: FocusEvent): void {
    const composer = event.currentTarget as HTMLElement;
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && composer.contains(nextTarget)) return;

    if (this.blurAddTimer) clearTimeout(this.blurAddTimer);
    this.blurAddTimer = setTimeout(() => {
      if (!composer.contains(composer.ownerDocument.activeElement)) {
        this.addSkill();
      }
      this.blurAddTimer = null;
    });
  }

  async onSkillImageChange(event: Event): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) return;

    if (!SUPPORTED_SKILL_IMAGE_TYPES.has(file.type)) {
      this.generationState.set('error');
      this.generationMessage.set('Use an SVG, PNG, JPG or WebP image.');
      inputElement.value = '';
      return;
    }
    if (file.size > MAX_SKILL_IMAGE_SIZE) {
      this.generationState.set('error');
      this.generationMessage.set('Use an image no larger than 2 MB.');
      inputElement.value = '';
      return;
    }

    this.generationMessage.set('Optimizing image...');
    try {
      const icon = await this.optimizeSkillImage(file);
      this.draftIcon.set(icon);
      this.applySkillImageDraft(icon);
      this.refreshDraft();
      this.generationState.set('uploaded');
      this.generationMessage.set('Image optimized and ready.');
    } catch {
      this.generationState.set('error');
      this.generationMessage.set(
        'Could not process this image. Try another SVG, PNG, JPG or WebP file.',
      );
    } finally {
      inputElement.value = '';
    }
  }

  private optimizeSkillImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!width || !height) {
          reject(new Error('Image has no dimensions'));
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = SKILL_ICON_SIZE;
        canvas.height = SKILL_ICON_SIZE;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas is unavailable'));
          return;
        }

        const scale = Math.min(
          SKILL_ICON_SIZE / width,
          SKILL_ICON_SIZE / height,
        );
        const targetWidth = width * scale;
        const targetHeight = height * scale;
        context.drawImage(
          image,
          (SKILL_ICON_SIZE - targetWidth) / 2,
          (SKILL_ICON_SIZE - targetHeight) / 2,
          targetWidth,
          targetHeight,
        );
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image could not be decoded'));
      };
      image.src = objectUrl;
    });
  }

  private refreshDraft(): void {
    this.draftRevision.update((value) => value + 1);
  }

  private findOption(name: string): SkillOption | undefined {
    return this.skillOptions().find(
      (skill) => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
  }

  private applySkillImageDraft(icon: string): void {
    const draftName = this.skillInput.value.trim();
    if (!draftName) return;

    const selectedOption = this.findOption(draftName);
    const skillName = selectedOption?.name ?? draftName;
    let updatedExistingSkill = false;
    const nextSkills = this.selectedSkills().map((skill) => {
      if (skill.name.toLocaleLowerCase() !== skillName.toLocaleLowerCase()) {
        return skill;
      }
      updatedExistingSkill = true;
      return { ...skill, icon };
    });

    if (updatedExistingSkill) {
      this.selectedSkillsChange.emit(nextSkills);
    }

    if (updatedExistingSkill || selectedOption) {
      this.store.rememberUserSkill({ name: skillName, icon });
    }
  }
}
