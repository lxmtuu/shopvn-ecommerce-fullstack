/** Cấu hình chung cho test — không cần DB thật vì test chỉ chạm logic thuần */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/ecommerce_test';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_'.padEnd(64, 'a');
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_'.padEnd(64, 'b');
process.env.MAIL_DRIVER = 'console';
