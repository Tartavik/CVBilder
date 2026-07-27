import { createFeature, createReducer, on } from '@ngrx/store';
import { CvListQuery, CvSummary } from '../../users-api.service';
import { publicCvsActions } from './public-cvs.actions';

export const PUBLIC_CV_PAGE_SIZE = 20;

export const initialPublicCvQuery: CvListQuery = {
  page: 1,
  pageSize: PUBLIC_CV_PAGE_SIZE,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  author: '',
  query: '',
  createdFrom: null,
  createdTo: null,
  skills: [],
};

export interface PublicCvsState {
  items: CvSummary[];
  query: CvListQuery;
  totalItems: number;
  totalPages: number;
  availableSkills: string[];
  loading: boolean;
  filterOptionsLoading: boolean;
  error: string | null;
}

const initialState: PublicCvsState = {
  items: [],
  query: initialPublicCvQuery,
  totalItems: 0,
  totalPages: 0,
  availableSkills: [],
  loading: false,
  filterOptionsLoading: false,
  error: null,
};

const reducer = createReducer(
  initialState,
  on(publicCvsActions.queryChanged, (state, { changes }) => ({
    ...state,
    query: {
      ...state.query,
      ...changes,
      page: changes.page ?? 1,
      pageSize: PUBLIC_CV_PAGE_SIZE,
    },
  })),
  on(publicCvsActions.pageLoadRequested, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(publicCvsActions.pageLoadSucceeded, (state, { response }) => ({
    ...state,
    items: response.items,
    query: {
      ...state.query,
      page: response.pagination.page,
      pageSize: response.pagination.pageSize,
    },
    totalItems: response.pagination.totalItems,
    totalPages: response.pagination.totalPages,
    loading: false,
    error: null,
  })),
  on(publicCvsActions.pageLoadFailed, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(publicCvsActions.filterOptionsLoadRequested, (state) => ({
    ...state,
    filterOptionsLoading: true,
  })),
  on(publicCvsActions.filterOptionsLoadSucceeded, (state, { options }) => ({
    ...state,
    availableSkills: options.skills,
    filterOptionsLoading: false,
  })),
  on(publicCvsActions.filterOptionsLoadFailed, (state) => ({
    ...state,
    filterOptionsLoading: false,
  })),
);

export const publicCvsFeature = createFeature({
  name: 'publicCvs',
  reducer,
});
