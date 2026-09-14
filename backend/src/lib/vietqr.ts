/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Sinh QR chuyển khoản theo chuẩn VIETQR / EMVCo (TLV)
 * ══════════════════════════════════════════════════════════════════════════
 *  Vì sao tự build thay vì gọi API img.vietqr.io?
 *   • Không phụ thuộc uptime / rate-limit của dịch vụ ngoài
 *   • Chạy được offline, test được bằng unit test (xem vietqr.test.ts)
 *   • Kiểm soát hoàn toàn nội dung CK (chính là mã đối soát)
 *
 *  Cấu trúc payload động:
 *   00 = "01"                        → phiên bản EMVCo
 *   01 = "12"                        → QR động (có số tiền, dùng 1 lần)
 *   38 (Merchant Account Info - VietQR)
 *      00 = "A000000727"            → GUID của VietQR
 *      01 → thông tin tài khoản thụ hưởng
 *           00 = BIN ngân hàng (6 số)
 *           01 = số tài khoản
 *      02 = "QRIBFTTA"              → chuyển nhanh tới tài khoản
 *   53 = "704"                       → VND
 *   54 = số tiền (số nguyên)
 *   58 = "VN"
 *   59 = tên người nhận (≤25 ký tự, không dấu)
 *   60 = "HA NOI" (thành phố)
 *   62 (Additional Data)
 *      05 = mã đơn (reference)
 *      08 = nội dung chuyển khoản
 *   63 = CRC-16/CCITT-FALSE (4 hex, tính trên toàn bộ chuỗi tính cả "6304")
 * ══════════════════════════════════════════════════════════════════════════
 */

export interface VietQRInput {
  bankBin: string;
  accountNo: string;
  accountName?: string;
  amount: number;
  orderCode: string;
  city?: string;
  purpose?: string;
}

/** Chuẩn hoá: bỏ dấu tiếng Việt, viết hoa, cắt còn 25 ký tự (giới hạn EMVCo) */
export function normalizeForQR(input: string, maxLen = 25): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

/** Một trường TLV: tag + độ dài 2 chữ số + giá trị */
export function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * CRC-16/CCITT-FALSE — polynomial 0x1021, init 0xFFFF, không reflect.
 * Đây là thuật toán chuẩn EMVCo yêu cầu cho tag 63.
 */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildVietQRPayload(input: VietQRInput): string {
  const { bankBin, accountNo, amount, orderCode } = input;

  // Validate sớm — dữ liệu sai sẽ tạo ra QR hỏng mà không ai biết
  if (!/^\d{6}$/.test(bankBin)) throw new Error(`BANK_BIN phải là 6 chữ số, nhận được: "${bankBin}"`);
  if (!/^[A-Za-z0-9]{4,25}$/.test(accountNo)) throw new Error(`Số tài khoản không hợp lệ: "${accountNo}"`);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Số tiền phải là số nguyên dương, nhận được: ${amount}`);

  const beneficiary = tlv('00', bankBin) + tlv('01', accountNo);
  const merchantAccount = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA');

  let payload =
    tlv('00', '01') +
    tlv('01', '12') + // 12 = QR động
    tlv('38', merchantAccount) +
    tlv('53', '704') +
    tlv('54', String(amount)) +
    tlv('58', 'VN') +
    tlv('59', normalizeForQR(input.accountName || 'SHOPVN')) +
    tlv('60', normalizeForQR(input.city || 'HA NOI', 15));

  const additional = tlv('05', orderCode) + tlv('08', normalizeForQR(input.purpose || `THANH TOAN ${orderCode}`, 25));
  payload += tlv('62', additional);

  payload += '6304'; // tag + length của CRC, rồi mới tới giá trị CRC
  return payload + crc16(payload);
}

/** Kiểm tra payload có hợp lệ về CRC (dùng trong test & khi verify lại) */
export function verifyPayloadCRC(payload: string): boolean {
  if (payload.length < 8) return false;
  const body = payload.slice(0, -4);
  const provided = payload.slice(-4).toUpperCase();
  return crc16(body) === provided;
}

/** Parse ngược payload → object (hữu ích khi debug QR của đối tác) */
export function parseTLV(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < payload.length - 4) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (Number.isNaN(len)) break;
    out[tag] = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

/** Danh sách ngân hàng phổ biến → hiển thị tên đẹp trên trang thanh toán */
export const BANK_NAMES: Record<string, string> = {
  '970436': 'Vietcombank',
  '970418': 'BIDV',
  '970415': 'VietinBank',
  '970405': 'Agribank',
  '970407': 'Techcombank',
  '970422': 'MB Bank',
  '970416': 'ACB',
  '970432': 'VPBank',
  '970403': 'Sacombank',
  '970423': 'TPBank',
  '970441': 'VIB',
  '970426': 'MSB',
  '970443': 'SHB',
  '970431': 'Eximbank',
  '970448': 'OCB',
  '970440': 'SeABank',
  '970437': 'HDBank',
  '970449': 'LPBank',
  '970424': 'Shinhan Bank VN',
  '546034': 'Cake by VPBank',
};

export const bankNameOf = (bin: string) => BANK_NAMES[bin] ?? `Ngân hàng (BIN ${bin})`;

/** Link dự phòng khi cần ảnh QR tĩnh do VietQR cung cấp */
export function fallbackQrImageUrl(input: VietQRInput): string {
  const params = new URLSearchParams({
    amount: String(input.amount),
    addInfo: input.orderCode,
    accountName: normalizeForQR(input.accountName || 'SHOPVN', 50),
  });
  return `https://img.vietqr.io/image/${input.bankBin}-${input.accountNo}-compact2.png?${params.toString()}`;
}
