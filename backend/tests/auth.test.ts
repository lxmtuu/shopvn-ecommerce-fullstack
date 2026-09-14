import { describe, expect, it } from 'vitest';
import { isCommonPassword, passwordIssues } from '../src/lib/password.js';
import { extractOrderCode } from '../src/utils/orderCode.js';
import { registerSchema, resetPasswordSchema } from '../src/modules/auth/auth.schema.js';
import { createOrderSchema } from '../src/modules/orders/orders.schema.js';

describe('passwordIssues — policy mật khẩu', () => {
  it('chấp nhận mật khẩu đủ mạnh', () => {
    expect(passwordIssues('MatKhau@123')).toEqual([]);
  });

  it('liệt kê đủ các lỗi thiếu', () => {
    const issues = passwordIssues('abc');
    expect(issues).toContain('Ít nhất 8 ký tự');
    expect(issues).toContain('Có ít nhất 1 chữ hoa');
    expect(issues).toContain('Có ít nhất 1 chữ số');
  });

  it('chặn mật khẩu phổ biến', () => {
    expect(isCommonPassword('password123')).toBe(true);
    expect(isCommonPassword('MatKhau@123')).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    fullName: 'Nguyễn Văn A',
    email: 'a@example.com',
    password: 'MatKhau@123',
    acceptTerms: true,
  };

  it('chấp nhận dữ liệu hợp lệ', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('chuẩn hoá email về chữ thường', () => {
    const result = registerSchema.safeParse({ ...valid, email: 'A@Example.COM' });
    expect(result.success && result.data.email).toBe('a@example.com');
  });

  it('từ chối mật khẩu yếu', () => {
    const result = registerSchema.safeParse({ ...valid, password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('từ chối số điện thoại Việt Nam không hợp lệ', () => {
    expect(registerSchema.safeParse({ ...valid, phone: '1234567890' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, phone: '0901234567' }).success).toBe(true);
  });

  it('bắt buộc đồng ý điều khoản', () => {
    expect(registerSchema.safeParse({ ...valid, acceptTerms: false }).success).toBe(false);
  });
});

describe('createOrderSchema', () => {
  it('yêu cầu có addressId HOẶC đủ thông tin giao hàng', () => {
    const noInfo = createOrderSchema.safeParse({ paymentMethod: 'COD' });
    expect(noInfo.success).toBe(false);

    const withAddress = createOrderSchema.safeParse({ paymentMethod: 'COD', addressId: 'addr_1' });
    expect(withAddress.success).toBe(true);

    const withManual = createOrderSchema.safeParse({
      paymentMethod: 'BANK_TRANSFER',
      recipientName: 'Trần Thị B',
      recipientPhone: '0901234567',
      provinceName: 'Hà Nội',
      detail: '45 Tràng Tiền',
    });
    expect(withManual.success).toBe(true);
  });

  it('từ chối phương thức thanh toán lạ', () => {
    expect(createOrderSchema.safeParse({ paymentMethod: 'BITCOIN', addressId: 'x' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('từ chối token quá ngắn', () => {
    expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'MatKhau@123' }).success).toBe(false);
  });
});

describe('tích hợp mã đơn ↔ schema đơn hàng', () => {
  it('mã đơn trong nội dung CK khớp định dạng dùng khi tạo đơn', () => {
    const orderCode = 'DH26091400123';
    expect(extractOrderCode(`Thanh toan ${orderCode}`)).toBe(orderCode);
  });
});
