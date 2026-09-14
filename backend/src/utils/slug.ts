import slugify from 'slugify';

/** "Tai nghe Sony WH-1000XM5" → "tai-nghe-sony-wh-1000xm5" */
export const toSlug = (input: string) =>
  slugify(input, { lower: true, strict: true, locale: 'vi', trim: true });

export async function toUniqueSlug(input: string, exists: (slug: string) => Promise<boolean>) {
  const base = toSlug(input) || 'item';
  let candidate = base;
  let i = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${i++}`;
    if (i > 200) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }
  return candidate;
}
