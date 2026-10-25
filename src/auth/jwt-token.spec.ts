import { createHmac } from 'node:crypto';
import { EmployeeRole } from '../employees/entities/employee.entity';
import { signJwt, verifyJwt } from './jwt-token';

function toBase64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signParts(header: unknown, payload: unknown, secret: string): string {
  const unsigned = `${toBase64Url(header)}.${toBase64Url(payload)}`;
  const signature = createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64url');
  return `${unsigned}.${signature}`;
}

describe('jwt-token', () => {
  const SECRET = 'test-secret-key';
  const NOW = 1_700_000_000;
  const CLAIMS = {
    sub: '11111111-1111-4111-8111-111111111111',
    email: 'admin@eldo.com.br',
    role: EmployeeRole.Admin,
  };

  it('assina e valida um token JWT válido retornando o payload', () => {
    const token = signJwt(CLAIMS, SECRET, 3600, NOW);

    const payload = verifyJwt(token, SECRET, NOW + 100);
    expect(payload).toEqual({
      ...CLAIMS,
      iat: NOW,
      exp: NOW + 3600,
    });
  });

  it.each([
    ['segredo incorreto', 'wrong-secret', NOW + 100],
    ['token expirado no limite exato', SECRET, NOW + 3600],
    ['token expirado após o vencimento', SECRET, NOW + 10_000],
  ])(
    'rejeita token com %s (%s)',
    (_reason, verificationSecret, verificationTime) => {
      const token = signJwt(CLAIMS, SECRET, 3600, NOW);

      expect(verifyJwt(token, verificationSecret, verificationTime)).toBeNull();
    },
  );

  it.each([
    [
      'role ou sub adulterado no payload mantendo a assinatura original',
      (() => {
        const validToken = signJwt(
          { ...CLAIMS, role: EmployeeRole.Employee },
          SECRET,
          3600,
          NOW,
        );
        const [headerPart, , signaturePart] = validToken.split('.');
        const tamperedPayload = toBase64Url({
          sub: '22222222-2222-4222-8222-222222222222',
          email: CLAIMS.email,
          role: EmployeeRole.Admin,
          iat: NOW,
          exp: NOW + 3600,
        });
        return `${headerPart}.${tamperedPayload}.${signaturePart}`;
      })(),
    ],
    [
      'header com alg "none"',
      signParts(
        { alg: 'none', typ: 'JWT' },
        { ...CLAIMS, iat: NOW, exp: NOW + 3600 },
        SECRET,
      ),
    ],
    [
      'assinatura válida sobre payload sem role válido',
      signParts(
        { alg: 'HS256', typ: 'JWT' },
        {
          sub: CLAIMS.sub,
          email: CLAIMS.email,
          role: 'superadmin',
          iat: NOW,
          exp: NOW + 3600,
        },
        SECRET,
      ),
    ],
  ])('rejeita token inválido: %s', (_attack, invalidToken) => {
    expect(verifyJwt(invalidToken, SECRET, NOW + 100)).toBeNull();
  });
});
