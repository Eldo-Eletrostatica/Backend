import { EmployeeRole } from '../employees/entities/employee.entity';
import { signJwt, verifyJwt } from './jwt-token';

describe('jwt-token', () => {
  const SECRET = 'test-secret-key';
  const CLAIMS = {
    sub: '11111111-1111-4111-8111-111111111111',
    email: 'admin@eldo.com.br',
    role: EmployeeRole.Admin,
  };

  it('assina e valida um token JWT válido retornando o payload', () => {
    const now = 1_700_000_000;
    const token = signJwt(CLAIMS, SECRET, 3600, now);

    const payload = verifyJwt(token, SECRET, now + 100);
    expect(payload).toEqual({
      ...CLAIMS,
      iat: now,
      exp: now + 3600,
    });
  });

  it.each([
    ['segredo incorreto', 'wrong-secret', 1_700_000_100],
    ['token expirado', SECRET, 1_700_003_600],
    ['token muito expirado', SECRET, 1_700_010_000],
  ])(
    'rejeita token com %s (%s)',
    (_reason, verificationSecret, verificationTime) => {
      const now = 1_700_000_000;
      const token = signJwt(CLAIMS, SECRET, 3600, now);

      expect(verifyJwt(token, verificationSecret, verificationTime)).toBeNull();
    },
  );

  it.each([
    ['formato sem três partes', 'apenas.duas'],
    ['assinatura adulterada', `${signJwt(CLAIMS, SECRET)}x`],
    ['payload corrompido', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalido.sig'],
  ])('rejeita token malformado: %s', (_case, invalidToken) => {
    expect(verifyJwt(invalidToken, SECRET)).toBeNull();
  });
});
