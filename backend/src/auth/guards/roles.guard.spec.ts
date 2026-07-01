import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../entities/user.entity';
import { RolesGuard } from './roles.guard';

/**
 * Builds a minimal ExecutionContext whose request carries the given user.
 * `getHandler`/`getClass` are only used as reflector lookup keys, so stubs suffice.
 */
function mockContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows the request when no roles metadata is present', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const ctx = mockContext({ role: UserRole.VIEWER });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows the request when the user has a matching role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN, UserRole.AGENT]);

    const ctx = mockContext({ role: UserRole.AGENT });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when the user role is not permitted', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN, UserRole.AGENT]);

    const ctx = mockContext({ role: UserRole.VIEWER });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
