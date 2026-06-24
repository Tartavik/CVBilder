export class PersonalDataDto {
  fullName!: string;
  jobTitle!: string;
  email!: string;
  phone!: string;
  city!: string;
  summary!: string;
  photo?: string;
}

export class ExperienceSkillDto {
  name!: string;
  icon?: string;
}

export class ExperienceItemDto {
  id?: string;
  company!: string;
  position!: string;
  startDate!: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  skills?: ExperienceSkillDto[];
}

export class EducationItemDto {
  id?: string;
  institution!: string;
  degree!: string;
  field!: string;
  year!: string;
}

export class SaveCvDto {
  personal!: PersonalDataDto;
  experience!: ExperienceItemDto[];
  education!: EducationItemDto[];
  generalSkills?: string[];
  experienceSkillMode?: 'text' | 'icons';
  sectionOrder?: string[];
  template?: 'single' | 'classic';
}
