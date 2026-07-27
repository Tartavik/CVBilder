import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, mergeMap, of, switchMap, withLatestFrom } from 'rxjs';
import { ErrorService } from '../../shared/errors/error.service';
import { UsersApiService } from '../../users-api.service';
import { publicCvsActions } from './public-cvs.actions';
import { publicCvsFeature } from './public-cvs.reducer';

@Injectable()
export class PublicCvsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(UsersApiService);
  private readonly errors = inject(ErrorService);

  readonly initialize$ = createEffect(() =>
    this.actions$.pipe(
      ofType(publicCvsActions.initialize),
      mergeMap(() => [
        publicCvsActions.pageLoadRequested(),
        publicCvsActions.filterOptionsLoadRequested(),
      ]),
    ),
  );

  readonly queryChanged$ = createEffect(() =>
    this.actions$.pipe(
      ofType(publicCvsActions.queryChanged),
      map(() => publicCvsActions.pageLoadRequested()),
    ),
  );

  readonly refresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(publicCvsActions.refreshRequested),
      map(() => publicCvsActions.pageLoadRequested()),
    ),
  );

  readonly loadPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(publicCvsActions.pageLoadRequested),
      withLatestFrom(this.store.select(publicCvsFeature.selectQuery)),
      switchMap(([, query]) =>
        this.api.getAllCvs(query).pipe(
          map((response) => publicCvsActions.pageLoadSucceeded({ response })),
          catchError((error: HttpErrorResponse) =>
            of(
              publicCvsActions.pageLoadFailed({
                error: this.errors.getMessage(
                  error,
                  'Failed to load public CVs',
                ),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly loadFilterOptions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(publicCvsActions.filterOptionsLoadRequested),
      switchMap(() =>
        this.api.getCvFilterOptions().pipe(
          map((options) =>
            publicCvsActions.filterOptionsLoadSucceeded({ options }),
          ),
          catchError(() => of(publicCvsActions.filterOptionsLoadFailed())),
        ),
      ),
    ),
  );
}
