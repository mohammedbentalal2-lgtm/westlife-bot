const mongoose = require('mongoose');
const config = require('./config');

// الاتصال بقاعدة البيانات
mongoose.connect(config.mongoURI)
  .then(() => console.log('📁 تم الاتصال بقاعدة بيانات MongoDB بنجاح!'))
  .catch(err => console.error('❌ فشل الاتصال بقاعدة البيانات:', err));

// === 1. جدول المستخدمين والبيانات العامة (Users) ===
const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String, default: "" }
});

// === 2. جدول نقاط الإدارة والترقيات (AdminPoints & Promotions) ===
const AdminPointsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    rankName: { type: String, default: "مراقب متدرب" },
    activations: { type: Number, default: 0 },
    tickets: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    fingerprint: { type: Number, default: 0 }, // البصمة
    exceptions: { type: Number, default: 0 },  // الاستثنائيات
    police: { type: Number, default: 0 },      // نقاط الشرطة
    totalPoints: { type: Number, default: 0 }
});

// === 3. جدول التيكتات (Tickets) ===
const TicketSchema = new mongoose.Schema({
    channelId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    type: { type: String, required: true }, // دعم فني، تفعيل، شكاوى...
    status: { type: String, default: "open" }, // open, claimed, closed
    claimedBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

// === 4. جدول اختبارات التفعيل (Activations) ===
const ActivationSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    status: { type: String, default: "pending" }, // pending, passed, failed
    score: { type: Number, default: 0 },
    cooldownUntil: { type: Date, default: null },
    sonyId: { type: String, default: "" },
    voiceUrl: { type: String, default: "" } // رابط تعهد الفويس
});

// === 5. جدول الحسابات البنكية والقروض (BankAccounts & Loans) ===
const BankAccountSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    charId: { type: Number, required: true }, // رقم الشخصية (1-3)
    iban: { type: String, required: true, unique: true }, // 4 أرقام فريدة
    bankBalance: { type: Number, default: 5000 }, // رصيد البنك التلقائي
    cash: { type: Number, default: 1000 },        // الكاش
    loanAmount: { type: Number, default: 0 },     // القرض الحالي
    loanStatus: { type: String, default: "none" } // none, pending, approved
});

// === 6. سجل العمليات البنكية (BankLogs) ===
const BankLogSchema = new mongoose.Schema({
    type: { type: String, required: true }, // إيداع، سحب، تحويل، قرض، مخالفة، راتب
    amount: { type: Number, required: true },
    senderIban: { type: String, default: "BANK" },
    receiverIban: { type: String, default: "BANK" },
    senderName: { type: String, default: "SYSTEM" },
    receiverName: { type: String, default: "SYSTEM" },
    date: { type: Date, default: Date.now }
});

// === 7. جدول الهويات والشخصيات المتعددة (Identities) ===
const IdentitySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    charId: { type: Number, required: true }, // من 1 إلى 3
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, required: true },
    birthDate: { type: String, required: true },
    birthPlace: { type: String, required: true },
    nationalId: { type: String, required: true, unique: true }, // الرقم الوطني
    status: { type: String, default: "pending" } // pending, approved, rejected
});

// === 8. جدول نظام السجن (JailSystem) ===
const JailSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    savedRoles: { type: [String], default: [] }, // حفظ رتب العضو قبل السجن
    reason: { type: String, required: true },
    jailDurationHours: { type: Number, required: true },
    endsAt: { type: Date, required: true }
});

// === 9. جدول الإنذارات (Warnings) ===
const WarningSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    warnedBy: { type: String, required: true },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// === 10. جدول البصمة العسكرية وساعات العمل (DutyLogs) ===
const DutyLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    status: { type: String, default: "off" }, // on, idle, off
    lastLogin: { type: Date, default: Date.now },
    totalWorkMinutes: { type: Number, default: 0 }
});

// === 11. جدول السجل الجنائي للمخالفات (Violations) ===
const ViolationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    officerId: { type: String, required: true },
    type: { type: String, required: true }, // مخالفة مالية، حكم قضائي، إلخ
    amount: { type: Number, default: 0 },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// === 12. جدول التقديمات (Applications) ===
const ApplicationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    type: { type: String, required: true }, // إدارة، شرطة، عصابات، عدل
    answers: { type: Map, of: String },
    status: { type: String, default: "pending" }, // pending, approved, rejected
    createdAt: { type: Date, default: Date.now }
});

// === 13. جدول الهاتف والبيانات المستقلة للشخصية (PhoneData) ===
const PhoneDataSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    charId: { type: Number, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    twitterHandle: { type: String, required: true },
    tweets: { type: [String], default: [] }
});

// تصدير النماذج (Models) لاستخدامها في ملفات الأنظمة
module.exports = {
    User: mongoose.model('User', UserSchema),
    AdminPoints: mongoose.model('AdminPoints', AdminPointsSchema),
    Ticket: mongoose.model('Ticket', TicketSchema),
    Activation: mongoose.model('Activation', ActivationSchema),
    BankAccount: mongoose.model('BankAccount', BankAccountSchema),
    BankLog: mongoose.model('BankLog', BankLogSchema),
    Identity: mongoose.model('Identity', IdentitySchema),
    Jail: mongoose.model('Jail', JailSchema),
    Warning: mongoose.model('Warning', WarningSchema),
    DutyLog: mongoose.model('DutyLog', DutyLogSchema),
    Violation: mongoose.model('Violation', ViolationSchema),
    Application: mongoose.model('Application', ApplicationSchema),
    PhoneData: mongoose.model('PhoneData', PhoneDataSchema)
};
  
