import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/userModel.js';

// Helper untuk membuat token
const generateTokens = (user) => {
  const payload = { id: user.id, username: user.username, email: user.email };
  
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'keuangan_access_token_secret_key_2026_xyz123',
    { expiresIn: '15m' } // Access token aktif selama 15 menit
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'keuangan_refresh_token_secret_key_2026_abc987',
    { expiresIn: '7d' } // Refresh token aktif selama 7 hari
  );

  return { accessToken, refreshToken };
};

const AuthController = {
  /**
   * Pendaftaran User Baru (Register)
   */
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;

      // Cek apakah username atau email sudah terdaftar
      const existingUser = await UserModel.findByUsernameOrEmail(username) || 
                           await UserModel.findByUsernameOrEmail(email);
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username atau Email sudah terdaftar.'
        });
      }

      // Hashing password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Simpan user baru ke database
      const newUser = await UserModel.create(username, email, hashedPassword);

      res.status(201).json({
        success: true,
        message: 'Registrasi berhasil! Silakan masuk ke akun Anda.',
        data: newUser
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Masuk Aplikasi (Login)
   */
  async login(req, res, next) {
    try {
      const { emailOrUsername, password } = req.body;

      // Cari user berdasarkan username/email
      const user = await UserModel.findByUsernameOrEmail(emailOrUsername);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Kredensial salah. Username/Email tidak ditemukan.'
        });
      }

      // Verifikasi password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Kredensial salah. Password Anda tidak sesuai.'
        });
      }

      // Generate Access Token & Refresh Token
      const { accessToken, refreshToken } = generateTokens(user);

      // Simpan refresh token ke database
      await UserModel.updateRefreshToken(user.id, refreshToken);

      res.json({
        success: true,
        message: 'Login berhasil! Selamat datang kembali.',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menyegarkan Access Token yang Kadaluarsa (Refresh Token)
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh Token wajib disertakan.'
        });
      }

      // Cari user berdasarkan refresh token di database
      const user = await UserModel.findByRefreshToken(refreshToken);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: 'Refresh Token tidak valid atau sudah tidak aktif.'
        });
      }

      // Verifikasi token JWT
      jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'keuangan_refresh_token_secret_key_2026_abc987',
        async (error, decoded) => {
          if (error) {
            return res.status(403).json({
              success: false,
              message: 'Refresh Token telah kadaluarsa atau rusak. Silakan login kembali.'
            });
          }

          // Generate Access Token baru
          const payload = { id: user.id, username: user.username, email: user.email };
          const newAccessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'keuangan_access_token_secret_key_2026_xyz123',
            { expiresIn: '15m' }
          );

          res.json({
            success: true,
            accessToken: newAccessToken
          });
        }
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Keluar Aplikasi (Logout)
   */
  async logout(req, res, next) {
    try {
      // Logout bisa menggunakan payload user jika terotentikasi,
      // atau menggunakan refresh token yang dikirim di body.
      const { refreshToken } = req.body;
      let userId = req.user ? req.user.id : null;

      if (!userId && refreshToken) {
        const user = await UserModel.findByRefreshToken(refreshToken);
        if (user) {
          userId = user.id;
        }
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Gagal memproses logout. Identitas pengguna tidak ditemukan.'
        });
      }

      // Hapus refresh token di database
      await UserModel.clearRefreshToken(userId);

      res.json({
        success: true,
        message: 'Berhasil keluar. Sesi Anda telah dihapus secara aman.'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default AuthController;
