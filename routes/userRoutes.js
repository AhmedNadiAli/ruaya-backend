const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// إنشاء مستخدم جديد
router.post('/register', userController.register);

// تسجيل الدخول
router.post('/login', userController.login);

// جلب بيانات المستخدم
router.get('/:id', userController.getUser);

// تحديث بيانات المستخدم
router.put('/:id', userController.updateUser);

// جلب كل المستخدمين (للأوائل)
router.get('/', userController.getAllUsers);

module.exports = router;