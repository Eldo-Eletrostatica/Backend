import { hashPassword, verifyPassword } from './password-hash';

describe('password-hash', () => {
  it('gera um hash no formato scrypt e valida a senha correta', async () => {
    const hash = await hashPassword('SenhaForte@123');

    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('SenhaForte@123', hash)).toBe(true);
  });

  it('gera hashes diferentes para a mesma senha devido ao salt aleatório', async () => {
    const firstHash = await hashPassword('MesmaSenha123');
    const secondHash = await hashPassword('MesmaSenha123');

    expect(firstHash).not.toBe(secondHash);
  });

  it.each([
    ['senha incorreta', 'OutraSenha123', undefined],
    ['hash sem prefixo scrypt', 'Senha123', 'bcrypt$abc$def'],
    ['hash malformado curto', 'Senha123', 'hash'],
    ['hash com tamanho hex inválido', 'Senha123', 'scrypt$abcd$1234'],
  ])(
    'retorna false para %s (%s)',
    async (_case, candidatePassword, customStoredHash) => {
      const validHash = await hashPassword('Senha123');
      const storedHash = customStoredHash ?? validHash;

      expect(await verifyPassword(candidatePassword, storedHash)).toBe(false);
    },
  );
});
