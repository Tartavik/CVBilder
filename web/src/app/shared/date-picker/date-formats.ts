export const APP_DATE_FORMATS = {
  parse: {
    dateInput: null,
  },
  display: {
    dateInput: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
    monthYearLabel: {
      year: 'numeric',
      month: 'short',
    },
    dateA11yLabel: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    monthYearA11yLabel: {
      year: 'numeric',
      month: 'long',
    },
  },
} as const;

export const APP_MONTH_FORMATS = {
  parse: {
    dateInput: null,
  },
  display: {
    dateInput: {
      year: 'numeric',
      month: '2-digit',
    },
    monthYearLabel: {
      year: 'numeric',
      month: 'short',
    },
    dateA11yLabel: {
      year: 'numeric',
      month: 'long',
    },
    monthYearA11yLabel: {
      year: 'numeric',
      month: 'long',
    },
  },
} as const;
