import { describe, expect, it } from 'vitest';
import {
  buildVietQRPayload,
  crc16,
  normalizeForQR,
  parseTLV,
  verifyPayloadCRC,
  bankNameOf,
} from '../src/lib/vietqr.js';

/**
 * Test cho chuẩn EMVCo — đây là phần dễ sai nhất và sai thì
 * khách quét QR sẽ chuyển tiền SAI, nên phải được test kỹ.
 */
describe('crc16 (CRC-16/CCITT-FALSE)', () => {
  it('tính đúng giá trị chuẩn của EMVCo', () => {
    // Vector kiểm thử chuẩn: "123456789" → 0x29B1
    expect(crc16('123456789')).toBe('29B1');
  });

  it('luôn trả về 4 ký tự hex viết hoa', () => {
    const value = crc16('A000000727');
    expect(value).toHaveLength(4);
    expect(value).toMatch(/^[0-9A-F]{4}$/);
  });
});

describe('normalizeForQR', () => {
  it('bỏ dấu tiếng Việt', () => {
    expect(normalizeForQR('Nguyễn Văn A')).toBe('NGUYEN VAN A');
    expect(normalizeForQR('Đỗ Thị Hồng')).toBe('DO THI HONG');
  });

  it('cắt đúng giới hạn ký tự của EMVCo', () => {
    const long = 'a'.repeat(100);
    expect(normalizeForQR(long).length).toBeLessThanOrEqual(25);
    expect(normalizeForQR(long, 15).length).toBeLessThanOrEqual(15);
  });
});

describe('buildVietQRPayload', () => {
  const input = {
    bankBin: '970436',
    accountNo: '0011000123456',
    accountName: 'Nguyễn Văn A',
    amount: 499000,
    orderCode: 'DH26091400123',
  };

  it('sinh payload có CRC hợp lệ', () => {
    const payload = buildVietQRPayload(input);
    expect(verifyPayloadCRC(payload)).toBe(true);
    expect(payload.endsWith(crc16(payload.slice(0, -4)))).toBe(true);
  });

  it('chứa đúng mã đơn để đối soát tự động', () => {
    const payload = buildVietQRPayload(input);
    expect(payload).toContain('DH26091400123');
  });

  it('chứa đúng BIN, số tài khoản, số tiền, đơn vị tiền tệ', () => {
    const tlvMap = parseTLV(buildVietQRPayload(input));
    expect(tlvMap['53']).toBe('704'); // VND
    expect(tlvMap['54']).toBe('499000');
    expect(tlvMap['58']).toBe('VN');
    expect(tlvMap['38']).toContain('970436');
    expect(tlvMap['38']).toContain('0011000123456');
    expect(tlvMap['38']).toContain('QRIBFTTA');
  });

  it('là QR động (tag 01 = 12) vì có số tiền', () => {
    const tlvMap = parseTLV(buildVietQRPayload(input));
    expect(tlvMap['00']).toBe('01');
    expect(tlvMap['01']).toBe('12');
  });

  it('từ chối dữ liệu không hợp lệ thay vì tạo QR hỏng', () => {
    expect(() => buildVietQRPayload({ ...input, bankBin: '97043' })).toThrow(/BANK_BIN/);
    expect(() => buildVietQRPayload({ ...input, accountNo: 'abc@@' })).toThrow(/Số tài khoản/);
    expect(() => buildVietQRPayload({ ...input, amount: 0 })).toThrow(/Số tiền/);
    expect(() => buildVietQRPayload({ ...input, amount: 1000.5 })).toThrow(/Số tiền/);
  });

  it('số tiền khác nhau → payload khác nhau (không dùng chung QR)', () => {
    const a = buildVietQRPayload({ ...input, amount: 100000 });
    const b = buildVietQRPayload({ ...input, amount: 200000 });
    expect(a).not.toBe(b);
  });
});

describe('bankNameOf', () => {
  it('tra được tên ngân hàng theo BIN', () => {
    expect(bankNameOf('970436')).toBe('Vietcombank');
    expect(bankNameOf('999999')).toContain('999999');
  });
});
