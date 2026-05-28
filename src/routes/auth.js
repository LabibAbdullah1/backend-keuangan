import express from 'express';
import validate from '../middlewares/validator.js';
import schemas from '../config/schemas.js';
import AuthController from '../controllers/authController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route: Register User Baru
router.post('/register', validate(schemas.registerSchema), AuthController.register);

// Route: Login
router.post('/login', validate(schemas.loginSchema), AuthController.login);

// Route: Refresh Token
router.post('/refresh', AuthController.refresh);

// Route: Logout (Bisa dipanggil oleh user terotentikasi, atau dengan mengirim refresh token)
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
