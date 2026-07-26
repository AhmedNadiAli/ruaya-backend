const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ========== قاعدة البيانات SQLite ==========
// ✅ استخدم './database.db' عشان يشتغل على Railway
const dbPath = './database.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log('❌ خطأ في فتح قاعدة البيانات:', err.message);
    } else {
        console.log('✅ متصل بقاعدة البيانات SQLite');
    }
});

// إنشاء الجدول (لو مش موجود)
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        path TEXT DEFAULT 'medicine',
        year TEXT DEFAULT '2',
        specialization TEXT DEFAULT '',
        weakSubjects TEXT DEFAULT '[]',
        preferredTime TEXT DEFAULT 'morning',
        goalScore INTEGER DEFAULT 500,
        onboardingDone INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        completedTasks TEXT DEFAULT '{}',
        badges TEXT DEFAULT '{}',
        weeklyProgress TEXT DEFAULT '{}',
        lastPathChange TEXT DEFAULT NULL,
        avatarUrl TEXT DEFAULT '',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// ========== Routes ==========

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send('🚀 سيرفر رؤية شغال!');
});

// جلب كل المستخدمين
app.get('/api/users', (req, res) => {
    db.all(`SELECT * FROM users ORDER BY points DESC`, (err, users) => {
        if (err) return res.status(400).json({ error: err.message });
        users.forEach(u => {
            try { u.completedTasks = JSON.parse(u.completedTasks); } catch(e) { u.completedTasks = {}; }
            try { u.badges = JSON.parse(u.badges); } catch(e) { u.badges = {}; }
            try { u.weakSubjects = JSON.parse(u.weakSubjects); } catch(e) { u.weakSubjects = []; }
        });
        res.json(users);
    });
});

// تسجيل مستخدم جديد
app.post('/api/users/register', (req, res) => {
    const { name, email, password, path, year } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'الاسم والإيميل وكلمة المرور مطلوبة' });
    }
    db.run(
        `INSERT INTO users (name, email, password, path, year) VALUES (?, ?, ?, ?, ?)`,
        [name, email, password, path || 'medicine', year || '2'],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'الإيميل مستخدم' });
                return res.status(400).json({ error: err.message });
            }
            res.status(201).json({ message: '✅ تم التسجيل', id: this.lastID });
        }
    );
});

// تسجيل الدخول
app.post('/api/users/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'الإيميل وكلمة المرور مطلوبة' });
    }
    db.get(
        `SELECT * FROM users WHERE email = ? AND password = ?`,
        [email, password],
        (err, user) => {
            if (err) return res.status(400).json({ error: err.message });
            if (!user) return res.status(401).json({ error: 'بيانات غير صحيحة' });
            try { user.completedTasks = JSON.parse(user.completedTasks); } catch(e) { user.completedTasks = {}; }
            try { user.badges = JSON.parse(user.badges); } catch(e) { user.badges = {}; }
            delete user.password;
            res.json({ message: '✅ تم تسجيل الدخول', user });
        }
    );
});

// جلب مستخدم واحد
app.get('/api/users/:id', (req, res) => {
    db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id], (err, user) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
        try { user.completedTasks = JSON.parse(user.completedTasks); } catch(e) { user.completedTasks = {}; }
        try { user.badges = JSON.parse(user.badges); } catch(e) { user.badges = {}; }
        delete user.password;
        res.json(user);
    });
});

// تحديث مستخدم
app.put('/api/users/:id', (req, res) => {
    const { name, path, year, specialization, weakSubjects, preferredTime, goalScore, onboardingDone, points, streak, progress, completedTasks, badges, lastPathChange, avatarUrl } = req.body;
    const updates = [], values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (path !== undefined) { updates.push('path = ?'); values.push(path); }
    if (year !== undefined) { updates.push('year = ?'); values.push(year); }
    if (specialization !== undefined) { updates.push('specialization = ?'); values.push(specialization); }
    if (weakSubjects !== undefined) { updates.push('weakSubjects = ?'); values.push(JSON.stringify(weakSubjects)); }
    if (preferredTime !== undefined) { updates.push('preferredTime = ?'); values.push(preferredTime); }
    if (goalScore !== undefined) { updates.push('goalScore = ?'); values.push(goalScore); }
    if (onboardingDone !== undefined) { updates.push('onboardingDone = ?'); values.push(onboardingDone ? 1 : 0); }
    if (points !== undefined) { updates.push('points = ?'); values.push(points); }
    if (streak !== undefined) { updates.push('streak = ?'); values.push(streak); }
    if (progress !== undefined) { updates.push('progress = ?'); values.push(progress); }
    if (completedTasks !== undefined) { updates.push('completedTasks = ?'); values.push(JSON.stringify(completedTasks)); }
    if (badges !== undefined) { updates.push('badges = ?'); values.push(JSON.stringify(badges)); }
    if (lastPathChange !== undefined) { updates.push('lastPathChange = ?'); values.push(lastPathChange); }
    if (avatarUrl !== undefined) { updates.push('avatarUrl = ?'); values.push(avatarUrl); }

    if (updates.length === 0) return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });

    values.push(req.params.id);
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: '✅ تم التحديث' });
    });
});

// حذف مستخدم
app.delete('/api/users/:id', (req, res) => {
    db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: '✅ تم الحذف' });
    });
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`);
    console.log('✅ قاعدة البيانات: SQLite');
    console.log('📁 مسار قاعدة البيانات:', dbPath);
});