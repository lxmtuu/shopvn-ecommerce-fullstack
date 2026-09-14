export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'ACCOUNT_BLOCKED'
  | 'EMAIL_NOT_VERIFIED'
  | 'NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'OUT_OF_STOCK'
  | 'COUPON_INVALID'
  | 'INVALID_STATUS_TRANSITION'
  | 'BUSINESS_RULE_VIOLATION'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Lỗi nghiệp vụ có chủ đích — được errorHandler chuyển thành response chuẩn.
 * KHÔNG dùng cho lỗi lập trình; những lỗi đó để rơi vào 500 và được log stack.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly errors?: FieldError[];
  public readonly isOperational = true;

  constructor(statusCode: number, message: string, code: ErrorCode = 'INTERNAL_ERROR', errors?: FieldError[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.name = 'AppError';
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = 'Dữ liệu không hợp lệ', errors?: FieldError[]) {
    return new AppError(400, message, 'VALIDATION_ERROR', errors);
  }
  static unauthorized(message = 'Bạn cần đăng nhập để tiếp tục', code: ErrorCode = 'UNAUTHORIZED') {
    return new AppError(401, message, code);
  }
  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
    return new AppError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Không tìm thấy dữ liệu') {
    return new AppError(404, message, 'NOT_FOUND');
  }
  static conflict(message: string, code: ErrorCode = 'BUSINESS_RULE_VIOLATION') {
    return new AppError(409, message, code);
  }
  static tooMany(message = 'Bạn thao tác quá nhanh, vui lòng thử lại sau') {
    return new AppError(429, message, 'TOO_MANY_REQUESTS');
  }
}
