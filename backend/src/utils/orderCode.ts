import { randomInt } from 'node:crypto';

/**
 * Mã đơn / mã đối soát chuyển khoản: DH + YYMMDD + 5 số.
 * Vì sao dạng này?
 *  • Không dấu, không khoảng trắng → app ngân hàng không làm hỏng nội dung CK
 *  • Độ dài cố định 13 ký tự → dễ regex bóc tách ở webhook
 *  • 100.000 tổ hợp/ngày → đủ, vẫn có unique index chống trùng
 */
export function generateOrderCode(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const rand = String(randomInt(0, 100000)).padStart(5, '0');
  return `DH${yy}${mm}${dd}${rand}`;
}

export const ORDER_CODE_REGEX = /\bDH\d{6}\d{5}\b/i;

/**
 * Bóc mã đơn từ nội dung chuyển khoản ngân hàng.
 *
 * Nội dung CK thực tế rất bẩn: ngân hàng tự chèn tiền tố (MBVCB, VCB...),
 * thêm mã giao dịch, dấu câu, có khi còn tách số bằng khoảng trắng.
 * Vì vậy dùng 2 lượt:
 *   1. Lượt "chặt": giữ ranh giới từ  → xử lý 95% trường hợp
 *   2. Lượt "lỏng": bỏ hết ký tự không phải chữ/số → cứu các trường hợp bị tách số
 */
export function extractOrderCode(content: string): string | null {
  const spaced = content.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
  const strict = spaced.match(ORDER_CODE_REGEX);
  if (strict) return strict[0].toUpperCase();

  const stripped = content.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const loose = stripped.match(/(?<![0-9])DH\d{11}(?![0-9])/);
  return loose ? loose[0] : null;
}
