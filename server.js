const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ========== قاعدة البيانات SQLite ==========
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log('❌ خطأ في فتح قاعدة البيانات:', err.message);
    } else {
        console.log('✅ متصل بقاعدة البيانات SQLite');
    }
});

// ========== إنشاء الجداول (مع إضافة حقل كلمة المرور) ==========
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

// ========== Routes الأساسية ==========

// ✅ الصفحة الرئيسية (للاختبار)
app.get('/', (req, res) => {
    res.send(`
        <h1 style="text-align:center;font-family:Arial;margin-top:50px;">🚀 سيرفر رؤية شغال!</h1>
        <p style="text-align:center;font-family:Arial;color:#666;">تم تشغيل السيرفر بنجاح ✅</p>
        <p style="text-align:center;font-family:Arial;color:#666;">يمكنك استخدام الـ API من خلال <code>/api/users</code></p>
    `);
});

// ✅ تسجيل مستخدم جديد (مع كلمة المرور)
app.post('/api/users/register', (req, res) => {
    const { name, email, password, path = 'medicine', year = '2' } = req.body;

    // التحقق من وجود البيانات المطلوبة
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'الاسم، الإيميل، وكلمة المرور مطلوبة' });
    }

    // التحقق من صيغة الإيميل (رقم_الطالب@محافظة.moe.edu.eg)
    const emailPattern = /^[0-9]+@[a-zA-Z0-9]+\.moe\.edu\.eg$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: 'الإيميل يجب أن يكون بصيغة: رقم_الطالب@محافظة.moe.edu.eg' });
    }

    // التحقق من طول كلمة المرور
    if (password.length < 6) {
        return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    db.run(
        `INSERT INTO users (name, email, password, path, year) VALUES (?, ?, ?, ?, ?)`,
        [name, email, password, path, year],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'هذا الإيميل مستخدم بالفعل' });
                }
                return res.status(400).json({ error: err.message });
            }
            res.status(201).json({ 
                message: '✅ تم التسجيل بنجاح', 
                id: this.lastID,
                user: { id: this.lastID, name, email, path, year }
            });
        }
    );
});

// ✅ تسجيل الدخول (بالإيميل وكلمة المرور)
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
            if (!user) return res.status(401).json({ error: 'الإيميل أو كلمة المرور غير صحيحة' });
            
            // تحويل البيانات النصية إلى كائنات
            try { user.completedTasks = JSON.parse(user.completedTasks); } catch(e) { user.completedTasks = {}; }
            try { user.badges = JSON.parse(user.badges); } catch(e) { user.badges = {}; }
            try { user.weakSubjects = JSON.parse(user.weakSubjects); } catch(e) { user.weakSubjects = []; }
            try { user.weeklyProgress = JSON.parse(user.weeklyProgress); } catch(e) { user.weeklyProgress = {}; }
            user.onboardingDone = user.onboardingDone === 1;
            
            // إزالة كلمة المرور من الرد
            delete user.password;
            
            res.json({ 
                message: '✅ تم تسجيل الدخول بنجاح', 
                user 
            });
        }
    );
});

// ✅ جلب جميع المستخدمين (للأوائل)
app.get('/api/users', (req, res) => {
    db.all(`SELECT id, name, email, path, year, points, streak, progress, badges, avatarUrl FROM users ORDER BY points DESC`, (err, users) => {
        if (err) return res.status(400).json({ error: err.message });
        users.forEach(user => {
            try { user.badges = JSON.parse(user.badges); } catch(e) { user.badges = {}; }
        });
        res.json(users);
    });
});

// ✅ جلب مستخدم واحد (بالمعرف)
app.get('/api/users/:id', (req, res) => {
    db.get(
        `SELECT id, name, email, path, year, specialization, weakSubjects, preferredTime, goalScore, onboardingDone, points, streak, progress, completedTasks, badges, weeklyProgress, lastPathChange, avatarUrl, createdAt FROM users WHERE id = ?`,
        [req.params.id],
        (err, user) => {
            if (err) return res.status(400).json({ error: err.message });
            if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
            
            try { user.completedTasks = JSON.parse(user.completedTasks); } catch(e) { user.completedTasks = {}; }
            try { user.badges = JSON.parse(user.badges); } catch(e) { user.badges = {}; }
            try { user.weakSubjects = JSON.parse(user.weakSubjects); } catch(e) { user.weakSubjects = []; }
            try { user.weeklyProgress = JSON.parse(user.weeklyProgress); } catch(e) { user.weeklyProgress = {}; }
            user.onboardingDone = user.onboardingDone === 1;
            
            res.json(user);
        }
    );
});

// ✅ تحديث بيانات مستخدم
app.put('/api/users/:id', (req, res) => {
    const { 
        name, path, year, specialization, weakSubjects, preferredTime, 
        goalScore, onboardingDone, points, streak, progress, 
        completedTasks, badges, weeklyProgress, lastPathChange, avatarUrl 
    } = req.body;
    
    const updates = [];
    const values = [];

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
    if (weeklyProgress !== undefined) { updates.push('weeklyProgress = ?'); values.push(JSON.stringify(weeklyProgress)); }
    if (lastPathChange !== undefined) { updates.push('lastPathChange = ?'); values.push(lastPathChange); }
    if (avatarUrl !== undefined) { updates.push('avatarUrl = ?'); values.push(avatarUrl); }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
    }

    values.push(req.params.id);
    db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: '✅ تم التحديث بنجاح' });
        }
    );
});

// ✅ حذف مستخدم (اختياري)
app.delete('/api/users/:id', (req, res) => {
    db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: '✅ تم حذف المستخدم' });
    });
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`);
    console.log('✅ قاعدة البيانات: SQLite (مش محتاج نت ولا IP)');
    console.log(`📌 اختبر الـ API: http://localhost:${PORT}/api/users`);
});