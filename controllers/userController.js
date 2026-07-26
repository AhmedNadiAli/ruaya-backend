const User = require('../models/User');

// إنشاء مستخدم جديد
exports.register = async (req, res) => {
    try {
        const { name, email, path, year } = req.body;
        const user = new User({ name, email, path, year });
        await user.save();
        res.status(201).json({ message: '✅ تم التسجيل', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// تسجيل الدخول
exports.login = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
        res.json({ message: '✅ تم تسجيل الدخول', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// جلب مستخدم
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// تحديث مستخدم
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// جلب كل المستخدمين (للأوائل)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ points: -1 });
        res.json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};