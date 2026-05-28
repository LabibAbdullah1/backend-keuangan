/**
 * Centralized global error handling middleware for Express.
 */
const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.error('[Error Handler Log]:', err.stack || err);

  let status = err.status || 500;
  let message = err.message || 'Terjadi kesalahan internal pada server.';
  let errors = null;

  if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Data ini sudah ada dalam sistem (Duplikat).';
  }

  if (err.isJoi) {
    status = 400;
    message = 'Validasi input gagal.';
    errors = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
  }

  res.status(status).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(isDevelopment && { stack: err.stack })
  });
};

export default errorHandler;
