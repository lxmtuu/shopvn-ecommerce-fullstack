import { describe, expect, it } from 'vitest';
import { extractOrderCode, generateOrderCode, ORDER_CODE_REGEX } from '../src/utils/orderCode.js';
import { calcDiscount } from '../src/utils/money.js';

describe('generateOrderCode', () => {
  it('theo đúng định dạng DH + YYMMDD + 5 số', () => {
    const code = generateOrderCode(new Date('2026-09-14T10:00:00Z'));
    expect(code).toMatch(/^DH260914\d{5}$/);
    expect(code).toHaveLength(13); // "DH" + YYMMDD (6) + 5 số ngẫu nhiên
  });

  it('không chứa ký tự có thể bị ngân hàng làm hỏng', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOrderCode()).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it('sinh 500 mã không trùng nhau (đủ ngẫu nhiên)', () => {
    const set = new Set(Array.from({ length: 500 }, () => generateOrderCode()));
    expect(set.size).toBeGreaterThan(490);
  });
});

describe('extractOrderCode — bóc mã đơn từ nội dung chuyển khoản', () => {
  it('bóc được khi nội dung sạch', () => {
    expect(extractOrderCode('DH26091400123')).toBe('DH26091400123');
  });

  it('bóc được khi ngân hàng chèn thêm text', () => {
    expect(extractOrderCode('Chuyen tien DH26091400123 thanh toan don hang')).toBe('DH26091400123');
    expect(extractOrderCode('MBVCB.1234567.DH26091400123.CT tu 1234567')).toBe('DH26091400123');
  });

  it('bóc được khi có dấu câu / khoảng trắng lạ', () => {
    expect(extractOrderCode('Thanh toan: DH26091400123.')).toBe('DH26091400123');
    expect(extractOrderCode('dh 260914 00123')).toBe('DH26091400123');
  });

  it('chuẩn hoá chữ thường thành chữ hoa', () => {
    expect(extractOrderCode('thanh toan dh26091400123')).toBe('DH26091400123');
  });

  it('trả null khi không có mã đơn', () => {
    expect(extractOrderCode('Chuyen tien mua hang')).toBeNull();
    expect(extractOrderCode('')).toBeNull();
  });

  it('regex không khớp nhầm chuỗi không đủ số', () => {
    expect(ORDER_CODE_REGEX.test('DH2609140')).toBe(false);
    expect(ORDER_CODE_REGEX.test('DH26091400123456')).toBe(false);
  });
});

describe('calcDiscount', () => {
  it('giảm theo phần trăm', () => {
    expect(calcDiscount('PERCENT', 10, 1000000).toString()).toBe('100000');
  });

  it('tôn trọng mức giảm tối đa', () => {
    expect(calcDiscount('PERCENT', 50, 1000000, 200000).toString()).toBe('200000');
  });

  it('giảm cố định', () => {
    expect(calcDiscount('FIXED', 50000, 300000).toString()).toBe('50000');
  });

  it('không bao giờ giảm quá giá trị đơn hàng (tránh tổng tiền âm)', () => {
    expect(calcDiscount('FIXED', 500000, 100000).toString()).toBe('100000');
    expect(calcDiscount('PERCENT', 100, 250000).toString()).toBe('250000');
  });
});
