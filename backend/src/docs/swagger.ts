/** Đặc tả OpenAPI 3.0 cho API ShopVN — xem tại /api/docs */
export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShopVN API',
    version: '1.0.0',
    description: `
REST API cho sàn thương mại điện tử ShopVN.

**Xác thực:** JWT trong cookie \`httpOnly\`. Gọi \`POST /auth/login\` trước, sau đó trình duyệt tự gửi cookie.
Với client khác (mobile/Postman), dùng header \`Authorization: Bearer <accessToken>\`.

**CSRF:** mọi request POST/PATCH/DELETE cần header \`x-csrf-token\` — lấy giá trị từ cookie \`csrf_token\`.

**Mã lỗi chung:** mọi response lỗi đều có dạng \`{ success: false, message, code, requestId, errors? }\`.
    `,
  },
  servers: [
    { url: 'http://localhost:4000/api/v1', description: 'Development' },
    { url: 'https://api.shopvn.vn/api/v1', description: 'Production' },
  ],
  tags: [
    { name: 'Auth', description: 'Đăng ký, đăng nhập, quên mật khẩu, phiên đăng nhập' },
    { name: 'Products', description: 'Sản phẩm, tìm kiếm, lọc' },
    { name: 'Categories' }, { name: 'Brands' },
    { name: 'Cart' }, { name: 'Wishlist' }, { name: 'Addresses' },
    { name: 'Orders', description: 'Đặt hàng, theo dõi, huỷ, trả hàng' },
    { name: 'Payments', description: 'Thanh toán chuyển khoản & QR VietQR' },
    { name: 'Reviews' }, { name: 'Coupons' }, { name: 'Uploads' },
    { name: 'Admin', description: 'Thống kê, quản trị (yêu cầu role ADMIN)' },
    { name: 'Webhooks', description: 'Callback từ ngân hàng (HMAC verified)' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      csrfHeader: { type: 'apiKey', in: 'header', name: 'x-csrf-token' },
    },
    schemas: {
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Thành công' },
          data: { type: 'object' },
          meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Dữ liệu không hợp lệ' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
          requestId: { type: 'string' },
        },
      },
    },
  },
  security: [{ cookieAuth: [], csrfHeader: [] }],
  paths: {
    '/health': { get: { tags: ['Admin'], summary: 'Kiểm tra API còn sống', responses: { 200: { description: 'OK' } } } },
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Đăng ký tài khoản', security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password', 'acceptTerms'],
                properties: {
                  fullName: { type: 'string', example: 'Nguyễn Văn A' },
                  email: { type: 'string', example: 'a@example.com' },
                  password: { type: 'string', example: 'MatKhau@123' },
                  phone: { type: 'string', example: '0901234567' },
                  acceptTerms: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Tạo tài khoản thành công' }, 409: { description: 'Email đã tồn tại' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Đăng nhập', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: { description: 'Set cookie access_token + refresh_token' }, 401: { description: 'Sai thông tin đăng nhập' }, 429: { description: 'Quá nhiều lần thử' } },
      },
    },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Xoay refresh token (rotation)', responses: { 200: { description: 'OK' } } } },
    '/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Yêu cầu đặt lại mật khẩu', security: [], responses: { 200: { description: 'Luôn trả thành công' } } } },
    '/auth/reset-password': { post: { tags: ['Auth'], summary: 'Đặt lại mật khẩu bằng token', security: [], responses: { 200: { description: 'OK' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Thông tin người dùng hiện tại', responses: { 200: { description: 'OK' } } } },
    '/auth/sessions': { get: { tags: ['Auth'], summary: 'Danh sách thiết bị đang đăng nhập', responses: { 200: { description: 'OK' } } } },
    '/products': {
      get: {
        tags: ['Products'], summary: 'Danh sách sản phẩm (tìm kiếm, lọc, sắp xếp, phân trang)', security: [],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Từ khoá (hỗ trợ không dấu)' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Slug danh mục' },
          { name: 'brand', in: 'query', schema: { type: 'string' }, description: 'Slug thương hiệu, nhiều giá trị cách nhau dấu phẩy' },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'rating', in: 'query', schema: { type: 'number', minimum: 1, maximum: 5 } },
          { name: 'inStock', in: 'query', schema: { type: 'boolean' } },
          { name: 'onSale', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'price_asc', 'price_desc', 'best_selling', 'rating', 'discount'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 24 } },
        ],
        responses: { 200: { description: 'Trả kèm meta phân trang và facets (brand, khoảng giá)' } },
      },
    },
    '/products/{slug}': { get: { tags: ['Products'], summary: 'Chi tiết sản phẩm', security: [], parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Không tồn tại' } } } },
    '/products/suggestions': { get: { tags: ['Products'], summary: 'Gợi ý autocomplete', security: [], responses: { 200: { description: 'OK' } } } },
    '/cart': { get: { tags: ['Cart'], summary: 'Xem giỏ hàng (khách vãng lai dùng cookie cart_id)', security: [], responses: { 200: { description: 'OK' } } } },
    '/cart/items': { post: { tags: ['Cart'], summary: 'Thêm sản phẩm vào giỏ', security: [], responses: { 200: { description: 'OK' }, 409: { description: 'Vượt tồn kho' } } } },
    '/cart/merge': { post: { tags: ['Cart'], summary: 'Gộp giỏ khách vãng lai sau khi đăng nhập', responses: { 200: { description: 'OK' } } } },
    '/orders': {
      post: {
        tags: ['Orders'], summary: 'Tạo đơn hàng',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['paymentMethod', 'shippingMethod'],
                properties: {
                  addressId: { type: 'string' },
                  recipientName: { type: 'string' }, recipientPhone: { type: 'string' },
                  provinceName: { type: 'string' }, districtName: { type: 'string' }, wardName: { type: 'string' }, detail: { type: 'string' },
                  shippingMethod: { type: 'string', enum: ['STANDARD', 'EXPRESS', 'INSTANT'] },
                  paymentMethod: { type: 'string', enum: ['COD', 'BANK_TRANSFER', 'VNPAY', 'MOMO'] },
                  couponCode: { type: 'string' },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Tạo đơn thành công' }, 409: { description: 'Hết hàng / mã giảm giá không hợp lệ' } },
      },
      get: { tags: ['Orders'], summary: 'Đơn hàng của tôi', responses: { 200: { description: 'OK' } } },
    },
    '/orders/{orderCode}/cancel': { post: { tags: ['Orders'], summary: 'Huỷ đơn hàng', parameters: [{ name: 'orderCode', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/payments/{orderCode}/info': { get: { tags: ['Payments'], summary: 'Thông tin chuyển khoản + QR (data URL)', parameters: [{ name: 'orderCode', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/payments/{orderCode}/qr.png': { get: { tags: ['Payments'], summary: 'Ảnh QR PNG để tải về / in', security: [], parameters: [{ name: 'orderCode', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'PNG' } } } },
    '/payments/{orderCode}/confirm-transfer': { post: { tags: ['Payments'], summary: 'Khách báo đã chuyển khoản', parameters: [{ name: 'orderCode', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/bank-info': { get: { tags: ['Payments'], summary: 'Thông tin ngân hàng + phí ship của shop (công khai, dùng cho trang thanh toán)', security: [], responses: { 200: { description: 'OK' } } } },
    '/uploads/image': {
      post: {
        tags: ['Uploads'],
        summary: 'Tải 1 ảnh (avatar, ảnh bill chuyển khoản, ảnh đánh giá) — cần đăng nhập',
        description: 'Ảnh được resize ra 3 cỡ (full/card/thumb) dạng webp, tước EXIF, sinh `blurData` để hiển thị dần. Giới hạn dung lượng theo `MAX_FILE_SIZE_MB`.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Trả `{ url, cardUrl, thumbUrl, blurData, width, height }`' }, 400: { description: 'Thiếu file / sai định dạng / quá dung lượng' }, 401: { description: 'Chưa đăng nhập' }, 429: { description: 'Tải lên quá nhiều' } },
      },
    },
    '/uploads/images': {
      post: {
        tags: ['Uploads'],
        summary: 'Tải nhiều ảnh (thư viện ảnh sản phẩm) — tối đa 10 ảnh',
        description: 'Nhận field `files` hoặc `images`. Ảnh được xử lý LẦN LƯỢT để không ngốn RAM.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 },
                  images: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 10 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Mảng ảnh đã xử lý' }, 400: { description: 'Thiếu file' }, 401: { description: 'Chưa đăng nhập' } },
      },
    },
    '/uploads': {
      delete: {
        tags: ['Uploads'],
        summary: 'Xoá ảnh đã tải lên (ADMIN)',
        description: 'Chỉ xoá được file nằm trong `PUBLIC_UPLOAD_URL` — chặn việc dùng endpoint để dò/xoá file ngoài thư mục upload.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' } } } } } },
        responses: { 200: { description: 'Đã xoá' }, 403: { description: 'Không phải ADMIN' }, 404: { description: 'File không tồn tại' } },
      },
    },
    '/webhooks/bank': {
      post: {
        tags: ['Webhooks'], summary: 'Callback ngân hàng (Casso/SePay) — tự động xác nhận thanh toán',
        description: 'Verify HMAC-SHA256 với header `x-casso-signature` / `x-sepay-signature`. Idempotent: gọi lại nhiều lần vẫn an toàn.',
        security: [],
        responses: { 200: { description: 'Đã nhận (kể cả khi không khớp đơn nào)' }, 401: { description: 'Chữ ký sai' } },
      },
    },
    '/admin/stats/overview': { get: { tags: ['Admin'], summary: 'KPI dashboard + so sánh kỳ trước', responses: { 200: { description: 'OK' }, 403: { description: 'Không phải ADMIN' } } } },
    '/admin/stats/revenue': { get: { tags: ['Admin'], summary: 'Chuỗi doanh thu theo ngày/tháng', parameters: [{ name: 'range', in: 'query', schema: { type: 'string', enum: ['7d', '30d', '90d', '12m'] } }], responses: { 200: { description: 'OK' } } } },
    '/admin/stats/export': { get: { tags: ['Admin'], summary: 'Export CSV (orders/products/customers)', responses: { 200: { description: 'CSV' } } } },
    '/admin/products': { get: { tags: ['Admin'], summary: 'Danh sách sản phẩm (quản trị)', responses: { 200: { description: 'OK' } } }, post: { tags: ['Admin'], summary: 'Tạo sản phẩm', responses: { 201: { description: 'OK' } } } },
    '/admin/orders': { get: { tags: ['Admin'], summary: 'Tất cả đơn hàng (lọc nâng cao)', responses: { 200: { description: 'OK' } } } },
    '/admin/orders/{id}/status': { patch: { tags: ['Admin'], summary: 'Đổi trạng thái đơn (kiểm tra state machine)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 409: { description: 'Chuyển trạng thái không hợp lệ' } } } },
    '/admin/users': { get: { tags: ['Admin'], summary: 'Danh sách người dùng', responses: { 200: { description: 'OK' } } } },
    '/admin/users/{id}/status': { patch: { tags: ['Admin'], summary: 'Khoá / mở khoá tài khoản', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/admin/settings': { get: { tags: ['Admin'], summary: 'Cấu hình shop', responses: { 200: { description: 'OK' } } }, patch: { tags: ['Admin'], summary: 'Cập nhật cấu hình (bao gồm liên kết mạng xã hội, thông tin ngân hàng)', responses: { 200: { description: 'OK' } } } },
  },
} as const;
