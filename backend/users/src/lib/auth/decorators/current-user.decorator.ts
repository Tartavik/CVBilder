import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenPayload } from '../auth.types';

interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

export const CurrentUser = createParamDecorator(
  (
    property: keyof AccessTokenPayload | undefined,
    context: ExecutionContext,
  ): AccessTokenPayload | AccessTokenPayload[keyof AccessTokenPayload] => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user as AccessTokenPayload;
    return property ? user[property] : user;
  },
);
