import { describe, expect, it } from 'vitest';
import { calcShippingFee, type ShippingConfig } from '../src/lib/shippingFee.js';

/**
 * Phí ship là tiền của khách ⇒ công thức phải có test.
 * Cấu hình được đọc từ `SiteSetting` (admin sửa được), nên test dùng cấu hình
 * giả lập chứ không phụ thuộc DB.
 */
const config: ShippingConfig = {
  fees: { STANDARD: 30000, EXPRESS: 50000, INSTANT: 80000 },
  freeShipThreshold: 500000,
};

describe('calcShippingFee', () => {
  it('đơn dưới ngưỡng: thu đúng phí của từng phương thức', () => {
    expect(calcShippingFee('STANDARD', 100000, config)).toBe(30000);
    expect(calcShippingFee('EXPRESS', 100000, config)).toBe(50000);
    expect(calcShippingFee('INSTANT', 100000, config)).toBe(80000);
  });

  it('STANDARD được miễn phí khi đạt đúng ngưỡng (>=, không phải >)', () => {
    expect(calcShippingFee('STANDARD', 499999, config)).toBe(30000);
    expect(calcShippingFee('STANDARD', 500000, config)).toBe(0);
    expect(calcShippingFee('STANDARD', 900000, config)).toBe(0);
  });

  it('EXPRESS/INSTANT vẫn thu phí dù đơn rất lớn (giao nhanh tốn cost thật)', () => {
    expect(calcShippingFee('EXPRESS', 5000000, config)).toBe(50000);
    expect(calcShippingFee('INSTANT', 5000000, config)).toBe(80000);
  });

  it('đổi cấu hình là đổi ngay số tiền thu (không còn hằng số trong code)', () => {
    const custom: ShippingConfig = {
      fees: { STANDARD: 15000, EXPRESS: 25000, INSTANT: 40000 },
      freeShipThreshold: 200000,
    };
    expect(calcShippingFee('STANDARD', 199999, custom)).toBe(15000);
    expect(calcShippingFee('STANDARD', 200000, custom)).toBe(0);
    expect(calcShippingFee('EXPRESS', 1000000, custom)).toBe(25000);
  });

  it('giỏ hàng rỗng hoặc subtotal âm: không thu phí (không tạo đơn thì không có phí)', () => {
    expect(calcShippingFee('STANDARD', 0, config)).toBe(0);
    expect(calcShippingFee('EXPRESS', 0, config)).toBe(0);
    expect(calcShippingFee('INSTANT', -1, config)).toBe(0);
  });

  it('phương thức lạ (dữ liệu cũ) rơi về quy tắc STANDARD, không bao giờ NaN', () => {
    // Nghiêng về phía thu tiền chứ không tặng phí ship vì một giá trị lạ
    expect(calcShippingFee('DRONE', 100000, config)).toBe(30000);
    expect(calcShippingFee('DRONE', 600000, config)).toBe(0);
    expect(Number.isNaN(calcShippingFee('DRONE', 100000, config))).toBe(false);
  });

  it('ngưỡng freeship = 0 nghĩa là miễn phí STANDARD cho mọi đơn', () => {
    expect(calcShippingFee('STANDARD', 1, { ...config, freeShipThreshold: 0 })).toBe(0);
  });
});
