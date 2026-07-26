const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    path: { type: String, default: 'medicine' },
    year: { type: String, default: '2' },
    points: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    completedTasks: { type: Object, default: {} },
    badges: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);