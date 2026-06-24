export interface SkillOption {
  name: string;
  icon: string | null;
  label: string;
  color: string;
}

export const SKILL_OPTIONS: SkillOption[] = [
  { name: 'Angular', icon: 'angular', label: 'A', color: '#dd0031' },
  { name: 'TypeScript', icon: 'typescript', label: 'TS', color: '#3178c6' },
  { name: 'JavaScript', icon: 'javascript', label: 'JS', color: '#c9ad00' },
  { name: 'React', icon: 'react', label: 'R', color: '#087ea4' },
  { name: 'Vue.js', icon: 'vue', label: 'V', color: '#42b883' },
  { name: 'Node.js', icon: 'nodejs', label: 'N', color: '#339933' },
  { name: 'NestJS', icon: 'nestjs', label: 'NS', color: '#e0234e' },
  { name: 'PostgreSQL', icon: 'postgresql', label: 'PG', color: '#4169e1' },
  { name: 'MongoDB', icon: 'mongodb', label: 'M', color: '#47a248' },
  { name: 'Docker', icon: 'docker', label: 'D', color: '#2496ed' },
  { name: 'AWS', icon: 'aws', label: 'AWS', color: '#e87800' },
  { name: 'Git', icon: 'git', label: 'G', color: '#f05032' },
  { name: 'HTML', icon: 'html', label: '5', color: '#e34f26' },
  { name: 'CSS', icon: 'css', label: '3', color: '#1572b6' },
  { name: 'Python', icon: 'python', label: 'PY', color: '#3776ab' },
  { name: 'Java', icon: 'java', label: 'J', color: '#e76f00' },
  { name: 'C#', icon: 'csharp', label: 'C#', color: '#512bd4' },
  { name: '.NET', icon: 'dotnet', label: '.N', color: '#512bd4' },
];

const OPTIONS_BY_ICON = new Map(
  SKILL_OPTIONS.map((option) => [option.icon, option]),
);
const OPTIONS_BY_NAME = new Map(
  SKILL_OPTIONS.map((option) => [option.name.toLocaleLowerCase(), option]),
);

export function getSkillOption(
  icon: string | null | undefined,
  name = 'Technology',
): SkillOption {
  if (icon?.startsWith('data:image/')) {
    return {
      name,
      icon,
      label: getSkillInitials(name),
      color: getSkillColor(name),
    };
  }
  return (
    (icon ? OPTIONS_BY_ICON.get(icon) : undefined) ?? {
      name,
      icon: null,
      label: getSkillInitials(name),
      color: getSkillColor(name),
    }
  );
}

export function findSkillOptionByName(
  name: string,
): SkillOption | undefined {
  return OPTIONS_BY_NAME.get(name.trim().toLocaleLowerCase());
}

export function getSkillInitials(name: string): string {
  return name.trim().slice(0, 2).toLocaleUpperCase() || '?';
}

export function getSkillColor(name: string): string {
  const colors = [
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#dc2626',
    '#ea580c',
    '#16a34a',
    '#0891b2',
  ];
  const hash = [...name].reduce(
    (value, char) => value + char.charCodeAt(0),
    0,
  );
  return colors[hash % colors.length];
}
