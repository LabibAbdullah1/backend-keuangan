import jwt from 'jsonwebtoken';

/**
 * Middleware untuk memproteksi rute API menggunakan JWT Access Token
 */
export default function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  // Header Authorization harus dalam format: Bearer <token>
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token autentikasi tidak ditemukan atau tidak valid.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'keuangan_access_token_secret_key_2026_xyz123');
    
    // Sematkan data user ke objek request agar bisa digunakan di controller
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi telah kadaluarsa. Silakan segarkan token Anda.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Token autentikasi tidak valid.'
    });
  }
}
