import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const HASH_PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_LENGTH_BYTES = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH_BYTES)) as Buffer;
  return `${HASH_PREFIX}$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return false;
  }

  const [, salt, hashHex] = parts;
  if (!salt || !hashHex || hashHex.length !== KEY_LENGTH_BYTES * 2) {
    return false;
  }

  const expectedBuffer = Buffer.from(hashHex, 'hex');
  if (expectedBuffer.length !== KEY_LENGTH_BYTES) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH_BYTES)) as Buffer;
  return timingSafeEqual(derivedKey, expectedBuffer);
}
