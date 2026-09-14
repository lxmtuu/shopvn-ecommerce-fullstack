/**
 * Helper lấy param an toàn về mặt kiểu.
 *
 * Vì sao cần: @types/express v5 khai báo `ParamsDictionary` là `Record<string, string | string[]>`,
 * nên giá trị trong `params` có kiểu `string | string[]`.
 * Hàm này chuẩn hoá về `string` — dùng thay cho truy cập params trực tiếp ở controller.
 */
export const p = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
