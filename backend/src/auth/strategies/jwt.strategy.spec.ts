import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  } as any;

  it('constructs without throwing when JWT_SECRET is configured', () => {
    expect(() => new JwtStrategy(configService)).not.toThrow();
    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('validate() maps the JWT payload to AuthUser shape', () => {
    const strategy = new JwtStrategy(configService);
    const result = strategy.validate({
      sub: 'user-1',
      email: 'a@b.com',
      role: 'ADMIN',
      tenantId: 'tenant-1',
    });

    expect(result).toEqual({
      userId: 'user-1',
      email: 'a@b.com',
      role: 'ADMIN',
      tenantId: 'tenant-1',
    });
  });
});
