import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface PendingChangesAware {
  canDeactivate(): boolean | Observable<boolean>;
}

export const pendingChangesGuard: CanDeactivateFn<PendingChangesAware> = (
  component,
) => component.canDeactivate();
