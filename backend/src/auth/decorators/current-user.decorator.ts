import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Shape of the authenticated principal attached to `req.user` by JwtStrategy.
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
