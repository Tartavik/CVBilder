import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  CvFilterOptions,
  CvListQuery,
  PaginatedCvs,
} from '../../users-api.service';

export const publicCvsActions = createActionGroup({
  source: 'Public CVs',
  events: {
    Initialize: emptyProps(),
    'Query Changed': props<{ changes: Partial<CvListQuery> }>(),
    'Page Load Requested': emptyProps(),
    'Page Load Succeeded': props<{ response: PaginatedCvs }>(),
    'Page Load Failed': props<{ error: string }>(),
    'Filter Options Load Requested': emptyProps(),
    'Filter Options Load Succeeded': props<{
      options: CvFilterOptions;
    }>(),
    'Filter Options Load Failed': emptyProps(),
    'Refresh Requested': emptyProps(),
  },
});
