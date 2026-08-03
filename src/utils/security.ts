export function generateStrongPassword(length = 16): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{}';
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error('Güvenli parola üretimi için Web Crypto API kullanılamadı.');
  }

  const bytes = new Uint32Array(length);
  cryptoApi.getRandomValues(bytes);

  const raw = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
  const base = `${raw}Aa1!`;
  return base.slice(0, Math.max(length, 12));
}
