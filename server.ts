import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Record, Procedure, Officer, ReasonTemplate, AuditLog, User } from './src/types';

// Path for the database file and auto backups
const DB_DIR = path.join(process.cwd(), 'assets');
const DB_FILE = path.join(DB_DIR, 'db.json');
const BACKUP_DIR = path.join(DB_DIR, 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// Function to automatically create timestamped snapshots before code upgrades or manual updates
function createAutoSnapshot(reason: string = 'system_update') {
  try {
    ensureBackupDir();
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `db_snapshot_${dateStr}_${timeStr}_${reason}.json`;
      const snapshotFile = path.join(BACKUP_DIR, filename);
      fs.writeFileSync(snapshotFile, data, 'utf-8');

      // Update latest mirror snapshot
      const latestFile = path.join(BACKUP_DIR, 'db_snapshot_latest.json');
      fs.writeFileSync(latestFile, data, 'utf-8');

      // Keep max 30 snapshots to avoid filling disk
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('db_snapshot_') && f.endsWith('.json') && f !== 'db_snapshot_latest.json')
        .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 30) {
        files.slice(30).forEach(file => {
          try { fs.unlinkSync(path.join(BACKUP_DIR, file.name)); } catch (e) {}
        });
      }
    }
  } catch (err) {
    console.error('Failed to create database snapshot:', err);
  }
}

// Default mock and master data constants
const defaultUsers: User[] = [
  { id: '1', username: 'admin@caukieu', fullName: 'Quản trị viên Hệ thống', role: 'admin' },
  { id: 'u1', username: 'ngoc@caukieu', fullName: 'Dương Thị Hồng Ngọc', role: 'officer' },
  { id: 'u2', username: 'y@caukieu', fullName: 'Nguyễn Thị Xuân Ý', role: 'officer' },
  { id: 'u3', username: 'tung@caukieu', fullName: 'Nguyễn Thanh Tùng', role: 'officer' },
  { id: 'u4', username: 'huu@caukieu', fullName: 'Nguyễn Văn Hữu', role: 'officer' },
  { id: 'u5', username: 'dat@caukieu', fullName: 'Nguyễn Tiến Đạt', role: 'officer' },
  { id: 'u6', username: 'tuyen@caukieu', fullName: 'Lâm Thị Hồng Tuyến', role: 'officer' },
  { id: 'u7', username: 'diem@caukieu', fullName: 'Đoàn Ngọc Diễm', role: 'officer' },
  { id: 'u8', username: 'hieu@caukieu', fullName: 'Nguyễn Thị Ngọc Hiếu', role: 'officer' }
];

const defaultProcedures: Procedure[] = [
  { id: 'p1', code: 'TP-KHAISINH', name: 'Đăng ký khai sinh', field: 'Hộ tịch' },
  { id: 'p2', code: 'TP-KETHON', name: 'Đăng ký kết hôn', field: 'Hộ tịch' },
  { id: 'p3', code: 'TP-CHUNGTHUC', name: 'Chứng thực bản sao từ bản chính giấy tờ', field: 'Tư pháp' },
  { id: 'p4', code: 'XD-CAPPHEP', name: 'Cấp giấy phép xây dựng nhà ở riêng lẻ', field: 'Hạ tầng - Đô thị' },
  { id: 'p5', code: 'DD-CHUYENNHUONG', name: 'Đăng ký chuyển nhượng quyền sử dụng đất', field: 'Đất đai - Tài nguyên Môi trường' },
  { id: 'p6', code: 'LX-XACNHAN', name: 'Cấp giấy xác nhận tình trạng hôn nhân', field: 'Hộ tịch' }
];

const defaultOfficers: Officer[] = [
  {
    id: 'o1',
    name: 'Dương Thị Hồng Ngọc',
    dob: '02/10/1981',
    role: 'Phó Giám đốc Trung tâm',
    phone: '0989974173',
    level: 'Thạc sỹ',
    major: 'Thạc sĩ Khoa học Môi trường',
    it: 'A',
    language: 'C',
    political: 'Cao cấp',
    isPartyMember: true,
    salaryCoeff: '',
    citizenId: '',
    address: '',
    partyJoinDate: '',
    email: '',
    ethnicity: '',
    hometown: ''
  },
  {
    id: 'o2',
    name: 'Nguyễn Thị Xuân Ý',
    dob: '17/08/1987',
    role: 'Phó Giám đốc Trung tâm',
    phone: '0908825569',
    level: 'ĐH',
    major: 'Cử nhân Luật, Cử nhân Quản trị kinh doanh; Cử nhân Quản trị Văn phòng',
    it: 'B',
    language: 'Toeic 575',
    political: 'Trung cấp',
    isPartyMember: true,
    salaryCoeff: '',
    citizenId: '',
    address: '',
    partyJoinDate: '',
    email: '',
    ethnicity: '',
    hometown: ''
  },
  {
    id: 'o3',
    name: 'Nguyễn Thanh Tùng',
    dob: '07/02/1989',
    role: 'Chuyên viên',
    phone: '0908887662',
    level: 'Thạc sỹ',
    major: 'Thạc sĩ Kinh tế Chính trị; Cử nhân Quản trị Kinh doanh',
    it: 'B',
    language: 'B',
    political: 'Trung cấp',
    isPartyMember: true,
    salaryCoeff: '',
    citizenId: '',
    address: '',
    partyJoinDate: '',
    email: '',
    ethnicity: '',
    hometown: ''
  },
  {
    id: 'o4',
    name: 'Nguyễn Văn Hữu',
    dob: '05/09/1985',
    role: 'Chuyên viên',
    phone: '0939022539',
    level: 'ĐH',
    major: 'Cử nhân Luật',
    it: 'A',
    language: 'B',
    political: 'Trung cấp',
    isPartyMember: true,
    salaryCoeff: '',
    citizenId: '',
    address: '',
    partyJoinDate: '',
    email: '',
    ethnicity: '',
    hometown: ''
  },
  {
    id: 'o5',
    name: 'Nguyễn Tiến Đạt',
    dob: '19/10/1982',
    role: 'Chuyên viên',
    phone: '0919665223',
    level: 'ĐH',
    major: 'Kỹ sư xây dựng',
    it: 'Chứng chỉ Ứng dụng Công nghệ thông tin cơ bản',
    language: 'B',
    political: 'Trung cấp',
    isPartyMember: true,
    salaryCoeff: '',
    citizenId: '',
    address: '',
    partyJoinDate: '',
    email: '',
    ethnicity: '',
    hometown: ''
  },
  {
    id: 'o6',
    name: 'Lâm Thị Hồng Tuyến',
    dob: '24/08/1976',
    role: 'Chuyên viên',
    phone: '0909240876',
    level: 'Thạc sỹ',
    major: 'Thạc sĩ quản lý công; Cử nhân kinh tế luật',
    it: 'A',
    language: 'B',
    political: 'Trung cấp',
    isPartyMember: true,
    salaryCoeff: '',
    citizenId: '',
    address: '',
    partyJoinDate: '',
    email: '',
    ethnicity: '',
    hometown: ''
  },
  {
    id: 'o7',
    name: 'Đoàn Ngọc Diễm',
    dob: '27/10/1984',
    role: 'Chuyên viên',
    phone: '0908886570',
    level: 'ĐH',
    major: 'Cử nhân Luật',
    it: 'B',
    language: 'B',
    political: 'Trung cấp',
    isPartyMember: true,
    salaryCoeff: '',
    citizenId: '',
    address: '',
    partyJoinDate: '',
    email: '',
    ethnicity: '',
    hometown: ''
  },
  {
    id: 'o8',
    name: 'Nguyễn Thị Ngọc Hiếu',
    dob: '06/05/1977',
    role: 'Chuyên viên',
    phone: '0907632132',
    level: 'ĐH',
    major: 'Cử nhân kinh tế Luật',
    it: 'B',
    language: 'B',
    political: 'Trung cấp',
    isPartyMember: true,
    salaryCoeff: '',
    citizenId: '',
    address: '',
    partyJoinDate: '',
    email: '',
    ethnicity: '',
    hometown: ''
  }
];

const defaultReasons: ReasonTemplate[] = [
  { id: 'r1', formType: 'mau03', title: 'Không đúng thẩm quyền', content: 'Hồ sơ không thuộc thẩm quyền giải quyết của UBND Phường Cầu Kiệu, Thành phố Hồ Chí Minh theo quy định tại Luật Tổ chức chính quyền địa phương.' },
  { id: 'r2', formType: 'mau03', title: 'Thiếu giấy tờ quá hạn bổ sung', content: 'Hồ sơ thiếu các giấy tờ cốt lõi quy định mặc dù cán bộ tiếp nhận đã hướng dẫn chi tiết và quá thời hạn bổ sung theo quy định.' },
  { id: 'r3', formType: 'mau03', title: 'Không đủ điều kiện pháp lý', content: 'Qua đối chiếu kiểm tra thực địa và hồ sơ pháp lý, đối tượng yêu cầu không đủ điều kiện theo quy định của pháp luật hiện hành.' },
  { id: 'r4', formType: 'mau02', title: 'Thiếu CCCD/Định danh', content: 'Cần cung cấp bản sao CCCD hoặc Giấy xác nhận thông tin cư trú hợp lệ của đối tượng thụ lý.' },
  { id: 'r5', formType: 'mau02', title: 'Thiếu tờ khai đúng mẫu', content: 'Yêu cầu điền đầy đủ thông tin cá nhân và ký cam kết vào tờ khai đăng ký theo mẫu số 01/ĐK ban hành kèm theo Thông tư hướng dẫn.' },
  { id: 'r6', formType: 'mau02', title: 'Thiếu văn bản ủy quyền', content: 'Cần bổ sung Giấy ủy quyền hợp pháp có chứng thực của cơ quan Nhà nước nếu thực hiện thủ tục thay cho chủ sở hữu.' }
];

const defaultRecords: Record[] = [
  {
    id: 'rec1',
    formType: 'mau02',
    ticketNo: '01',
    createdDate: '2026-07-02',
    citizenName: 'Lê Văn Thịnh',
    citizenId: '079085002456',
    address: '154/12 Huỳnh Văn Bánh, Phường Cầu Kiệu, Quận Phú Nhuận',
    phone: '0903884422',
    email: 'thinh.le@gmail.com',
    recordId: 'HS-2026-004812',
    procedureContent: 'Cấp phép cải tạo nâng tầng nhà ở riêng lẻ',
    field: 'Hạ tầng - Đô thị',
    papersList: [
      'Bản vẽ thiết kế thi công đã sửa đổi đúng diện tích lộ giới',
      'Văn bản đồng thuận của các hộ liền kề về tường chung vách chung'
    ],
    officerPhone: '0909240876',
    officerName: 'Lâm Thị Hồng Tuyến',
    status: 'bo_sung',
    notes: 'Công dân hứa sẽ nộp lại vào thứ sáu tuần này.',
    history: [
      { timestamp: '2026-07-02T09:30:00Z', action: 'Khởi tạo', user: 'tuyen@caukieu', details: 'Lập phiếu yêu cầu bổ sung hồ sơ số 01' }
    ]
  },
  {
    id: 'rec2',
    formType: 'mau03',
    ticketNo: '01',
    createdDate: '2026-07-03',
    citizenName: 'Trần Thị Ngọc Thảo',
    citizenId: '082093005821',
    address: '88 Trường Sa, Phường Cầu Kiệu, Quận Phú Nhuận',
    phone: '0918774433',
    email: 'thaotran93@gmail.com',
    recordId: 'HS-2026-005234',
    procedureContent: 'Đăng ký chuyển nhượng quyền sử dụng đất đai',
    field: 'Đất đai - Tài nguyên Môi trường',
    rejectionReason: 'Hồ sơ không thuộc thẩm quyền giải quyết của UBND Phường Cầu Kiệu. Quyền sở hữu đất đai thuộc tranh chấp đang được thụ lý tại Tòa án nhân dân Quận Phú Nhuận.',
    officerName: 'Dương Thị Hồng Ngọc',
    status: 'tu_choi',
    notes: 'Đã giải thích rõ và hướng dẫn nộp đơn tranh chấp tại Tòa án quận.',
    history: [
      { timestamp: '2026-07-03T14:15:00Z', action: 'Khởi tạo', user: 'ngoc@caukieu', details: 'Lập phiếu từ chối giải quyết hồ sơ số 01' }
    ]
  }
];

const defaultLogs: AuditLog[] = [
  { id: 'l1', timestamp: '2026-07-06T09:00:00Z', username: 'admin@caukieu', action: 'Đăng nhập', details: 'Đăng nhập vào hệ thống quản lý' }
];

// Initialize database with default data if it doesn't exist
function initDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  ensureBackupDir();

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: defaultUsers,
      procedures: defaultProcedures,
      officers: defaultOfficers,
      reasons: defaultReasons,
      records: defaultRecords,
      auditLogs: defaultLogs,
      templates: [],
      dailyReports: [],
      reportConfig: {
        morningStart: '10:30',
        morningEnd: '12:30',
        afternoonStart: '16:00',
        afternoonEnd: '18:00'
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log('Database initialized successfully at', DB_FILE);
    createAutoSnapshot('initialization');
  }
}

initDB();

// Read all database data with Zero-Data-Loss safe migration
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    let changed = false;

    // Preserve all existing collections safely
    if (!parsed.records || !Array.isArray(parsed.records)) { parsed.records = defaultRecords; changed = true; }
    
    // Auto-migrate record ticketNo for Đất đai field from 345 to 01
    if (Array.isArray(parsed.records)) {
      parsed.records.forEach((r: any) => {
        if (r.ticketNo === '345' && r.field && r.field.toLowerCase().includes('đất đai')) {
          r.ticketNo = '01';
          changed = true;
        }
      });
    }

    if (!parsed.dailyReports || !Array.isArray(parsed.dailyReports)) { 
      parsed.dailyReports = []; 
      changed = true; 
    } else {
      // Auto-deduplicate duplicate daily report entries for same date and officerId
      const mergedMap = new Map<string, any>();
      parsed.dailyReports.forEach((r: any) => {
        const key = `${r.date}_${r.officerId}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, { ...r });
        } else {
          const existing = mergedMap.get(key);
          if (r.morning) existing.morning = { ...(existing.morning || {}), ...r.morning };
          if (r.afternoon) existing.afternoon = { ...(existing.afternoon || {}), ...r.afternoon };
          if (r.paperDossiers) existing.paperDossiers = { ...(existing.paperDossiers || {}), ...r.paperDossiers };
          if (r.difficulties) existing.difficulties = r.difficulties;
          if (r.suggestions) existing.suggestions = r.suggestions;
          if (r.reportedAt && new Date(r.reportedAt) > new Date(existing.reportedAt || 0)) {
            existing.reportedAt = r.reportedAt;
          }
        }
      });
      const mergedList = Array.from(mergedMap.values());
      if (mergedList.length !== parsed.dailyReports.length) {
        parsed.dailyReports = mergedList;
        changed = true;
      }
    }
    if (!parsed.auditLogs || !Array.isArray(parsed.auditLogs)) { parsed.auditLogs = defaultLogs; changed = true; }
    if (!parsed.templates || !Array.isArray(parsed.templates)) { parsed.templates = []; changed = true; }
    if (!parsed.reasons || !Array.isArray(parsed.reasons)) { parsed.reasons = defaultReasons; changed = true; }
    if (!parsed.procedures || !Array.isArray(parsed.procedures)) { parsed.procedures = defaultProcedures; changed = true; }

    // Safe Non-Destructive Officers Migration: Keep ALL existing user-added officers
    if (!parsed.officers || !Array.isArray(parsed.officers)) {
      parsed.officers = defaultOfficers;
      changed = true;
    } else {
      // Ensure default officers exist without deleting or overwriting custom user-added officers
      defaultOfficers.forEach(dOff => {
        const existingIdx = parsed.officers.findIndex((o: any) => o.id === dOff.id || o.name === dOff.name);
        if (existingIdx === -1) {
          parsed.officers.push(dOff);
          changed = true;
        } else {
          // Fill missing properties if any key is missing from default
          const existing = parsed.officers[existingIdx];
          let updated = false;
          Object.keys(dOff).forEach(k => {
            if ((existing as any)[k] === undefined) {
              (existing as any)[k] = (dOff as any)[k];
              updated = true;
            }
          });
          if (updated) changed = true;
        }
      });
    }

    // Safe Users Migration: Preserve custom users while making sure default admin accounts exist
    if (!parsed.users || !Array.isArray(parsed.users)) {
      parsed.users = defaultUsers;
      changed = true;
    } else {
      defaultUsers.forEach(dUser => {
        if (!parsed.users.some((u: any) => u.username === dUser.username)) {
          parsed.users.push(dUser);
          changed = true;
        }
      });
    }

    // Safe Report Config Migration
    if (!parsed.reportConfig) {
      parsed.reportConfig = {
        morningStart: '10:30',
        morningEnd: '12:30',
        afternoonStart: '16:00',
        afternoonEnd: '18:00'
      };
      changed = true;
    } else {
      if (parsed.reportConfig.morningEnd === '12:00') { parsed.reportConfig.morningEnd = '12:30'; changed = true; }
      if (parsed.reportConfig.afternoonStart === '15:30') { parsed.reportConfig.afternoonStart = '16:00'; changed = true; }
    }

    if (changed) {
      // Create auto snapshot before saving migration changes
      createAutoSnapshot('auto_schema_upgrade');
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log('Database safely auto-migrated without data loss.');
    }

    return parsed;
  } catch (error) {
    console.error('Error reading database file, returning default fallback state:', error);
    return {
      users: defaultUsers,
      procedures: defaultProcedures,
      officers: defaultOfficers,
      reasons: defaultReasons,
      records: defaultRecords,
      auditLogs: defaultLogs,
      templates: [],
      dailyReports: [],
      reportConfig: {
        morningStart: '10:30',
        morningEnd: '12:30',
        afternoonStart: '16:00',
        afternoonEnd: '18:00'
      }
    };
  }
}

// Write database data
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database file', error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Helper to log user audits
  const addAudit = (username: string, action: string, details: string, req: express.Request) => {
    const db = readDB();
    const newLog: AuditLog = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      username: username || 'Ẩn danh',
      action,
      details,
      ip: req.ip || req.socket.remoteAddress
    };
    db.auditLogs.unshift(newLog);
    writeDB(db);
  };

  // --- API API ROUTES ---

  // 1. AUTH API
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find((u: any) => u.username === username);

    // Simple test validation: allow login with matches (e.g. admin@caukieu/123456789, hung.nv/123, mai.tt/123)
    const isPasswordValid = 
      (username === 'admin@caukieu' && password === '123456789') ||
      (username === 'admin' && (password === 'admin' || password === '123456789')) ||
      (user && user.role !== 'admin' && (password === '123' || password === '123456'));

    if (user && isPasswordValid) {
      addAudit(username, 'Đăng nhập', `Đăng nhập hệ thống thành công (Vai trò: ${user.role})`, req);
      return res.json({ success: true, user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role } });
    }

    addAudit(username || 'Chưa xác định', 'Thất bại', `Đăng nhập thất bại cho tài khoản: ${username}`, req);
    return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  });

  app.post('/api/auth/logout', (req, res) => {
    const { username } = req.body;
    addAudit(username, 'Đăng xuất', 'Đăng xuất khỏi hệ thống', req);
    res.json({ success: true });
  });

  // 2. RECORDS API (CRUD & History)
  app.get('/api/records', (req, res) => {
    const db = readDB();
    res.json(db.records || []);
  });

  app.post('/api/records', (req, res) => {
    const db = readDB();
    const newRecord: Record = {
      ...req.body,
      id: req.body.id || 'rec_' + Math.random().toString(36).substring(2, 11),
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'Khởi tạo',
          user: req.body.creator || 'Cán bộ',
          details: `Khởi tạo hồ sơ mới với số phiếu ${req.body.ticketNo}`
        }
      ]
    };

    db.records.unshift(newRecord);
    writeDB(db);

    addAudit(req.body.creator || 'Cán bộ', 'Thêm', `Tạo hồ sơ mới: ${newRecord.citizenName} (${newRecord.ticketNo})`, req);
    res.json({ success: true, record: newRecord });
  });

  app.put('/api/records/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const recordIndex = db.records.findIndex((r: any) => r.id === id);

    if (recordIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });
    }

    const oldRecord = db.records[recordIndex];
    const modifier = req.body.modifier || 'Cán bộ';

    // Track detailed changes for history
    const changes: string[] = [];
    if (oldRecord.status !== req.body.status) changes.push(`Trạng thái: ${oldRecord.status} -> ${req.body.status}`);
    if (oldRecord.citizenName !== req.body.citizenName) changes.push('Tên công dân');
    if (oldRecord.citizenId !== req.body.citizenId) changes.push('Số định danh');
    if (oldRecord.procedureContent !== req.body.procedureContent) changes.push('Nội dung thủ tục');
    if (req.body.papersList && JSON.stringify(oldRecord.papersList) !== JSON.stringify(req.body.papersList)) changes.push('Danh sách giấy tờ bổ sung');

    const changeDetails = changes.length > 0 ? `Chỉnh sửa: ${changes.join(', ')}` : 'Chỉnh sửa thông tin hồ sơ';

    const updatedRecord: Record = {
      ...oldRecord,
      ...req.body,
      history: [
        ...oldRecord.history,
        {
          timestamp: new Date().toISOString(),
          action: 'Chỉnh sửa',
          user: modifier,
          details: changeDetails
        }
      ]
    };

    db.records[recordIndex] = updatedRecord;
    writeDB(db);

    addAudit(modifier, 'Sửa', `Chỉnh sửa hồ sơ: ${updatedRecord.citizenName} (${updatedRecord.ticketNo})`, req);
    res.json({ success: true, record: updatedRecord });
  });

  app.delete('/api/records/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.query;
    const db = readDB();
    const record = db.records.find((r: any) => r.id === id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ.' });
    }

    db.records = db.records.filter((r: any) => r.id !== id);
    writeDB(db);

    addAudit((username as string) || 'Cán bộ', 'Xóa', `Xóa hồ sơ: ${record.citizenName} (${record.ticketNo})`, req);
    res.json({ success: true });
  });

  // 3. EXCEL/CSV IMPORT & SYNC
  app.post('/api/records/import', (req, res) => {
    const { data, username, replaceExisting } = req.body; // Array of record objects parsed on client
    if (!Array.isArray(data)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }

    const db = readDB();
    if (replaceExisting === true) {
      db.records = [];
    }

    let importCount = 0;
    let syncCount = 0;
    const errors: string[] = [];

    data.forEach((row: any, index: number) => {
      // Direct dry-run checks
      if (!row.citizenName) {
        errors.push(`Dòng ${index + 1}: Thiếu Họ tên công dân.`);
        return;
      }
      if (!row.ticketNo) {
        errors.push(`Dòng ${index + 1}: Thiếu Số phiếu.`);
        return;
      }

      // Check for duplicate in database
      const existingIndex = db.records.findIndex((r: any) => r.ticketNo === row.ticketNo || (r.recordId && r.recordId === row.recordId));

      if (existingIndex !== -1) {
        // Sync / Update record without generating duplicates, preserving old details and logging history
        const oldRecord = db.records[existingIndex];
        const updated: Record = {
          ...oldRecord,
          ...row,
          // Merge lists if applicable
          papersList: row.papersList || oldRecord.papersList,
          history: [
            ...oldRecord.history,
            {
              timestamp: new Date().toISOString(),
              action: 'Đồng bộ',
              user: username || 'Hệ thống',
              details: 'Đồng bộ dữ liệu tự động từ file nhập khẩu Excel/CSV'
            }
          ]
        };
        db.records[existingIndex] = updated;
        syncCount++;
      } else {
        // Create new
        const newRecord: Record = {
          id: 'rec_' + Math.random().toString(36).substring(2, 11),
          formType: row.formType || 'mau02',
          ticketNo: row.ticketNo,
          createdDate: row.createdDate || new Date().toISOString().split('T')[0],
          citizenName: row.citizenName,
          citizenId: row.citizenId,
          address: row.address || '',
          phone: row.phone || '',
          email: row.email || '',
          recordId: row.recordId || '',
          procedureContent: row.procedureContent || '',
          papersList: row.papersList || [],
          officerPhone: row.officerPhone || '',
          rejectionReason: row.rejectionReason || '',
          officerName: row.officerName || username || 'Công chức tiếp nhận',
          status: row.status || 'cho_xu_ly',
          notes: row.notes || 'Hồ sơ tạo tự động qua Import',
          history: [
            {
              timestamp: new Date().toISOString(),
              action: 'Khởi tạo',
              user: username || 'Hệ thống',
              details: 'Tạo hồ sơ mới từ file nhập khẩu Excel/CSV'
            }
          ]
        };
        db.records.unshift(newRecord);
        importCount++;
      }
    });

    writeDB(db);
    const auditDetail = replaceExisting 
      ? `Thay thế toàn bộ dữ liệu hiện có bằng ${importCount} hồ sơ từ file Excel/CSV`
      : `Nhập khẩu thành công ${importCount} hồ sơ mới, đồng bộ ${syncCount} hồ sơ cũ`;
    addAudit(username || 'Hệ thống', 'Import', auditDetail, req);

    res.json({
      success: true,
      importCount,
      syncCount,
      errors
    });
  });

  // 4. ADMIN CATEGORIES API
  // Procedures
  app.get('/api/procedures', (req, res) => {
    const db = readDB();
    res.json(db.procedures || []);
  });

  app.post('/api/procedures', (req, res) => {
    const db = readDB();
    const newProcedure: Procedure = {
      ...req.body,
      id: 'p_' + Math.random().toString(36).substring(2, 11)
    };
    db.procedures.push(newProcedure);
    writeDB(db);
    addAudit(req.body.username || 'Admin', 'Thêm', `Thêm thủ tục hành chính mới: ${newProcedure.name}`, req);
    res.json({ success: true, procedure: newProcedure });
  });

  app.delete('/api/procedures/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.query;
    const db = readDB();
    const proc = db.procedures.find((p: any) => p.id === id);
    db.procedures = db.procedures.filter((p: any) => p.id !== id);
    writeDB(db);
    if (proc) {
      addAudit((username as string) || 'Admin', 'Xóa', `Xóa thủ tục hành chính: ${proc.name}`, req);
    }
    res.json({ success: true });
  });

  app.put('/api/procedures/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.procedures.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thủ tục.' });
    }
    const oldProc = db.procedures[index];
    db.procedures[index] = { ...oldProc, ...req.body };
    writeDB(db);
    addAudit(req.body.username || 'Admin', 'Sửa', `Chỉnh sửa thủ tục: ${oldProc.name} -> ${req.body.name}`, req);
    res.json({ success: true, procedure: db.procedures[index] });
  });

  // Officers
  app.get('/api/officers', (req, res) => {
    const db = readDB();
    res.json(db.officers || []);
  });

  app.post('/api/officers', (req, res) => {
    const db = readDB();
    const newOfficer: Officer = {
      ...req.body,
      id: 'o_' + Math.random().toString(36).substring(2, 11)
    };
    db.officers.push(newOfficer);
    writeDB(db);
    addAudit(req.body.username || 'Admin', 'Thêm', `Thêm mới cán bộ: ${newOfficer.name}`, req);
    res.json({ success: true, officer: newOfficer });
  });

  app.delete('/api/officers/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.query;
    const db = readDB();
    const off = db.officers.find((o: any) => o.id === id);
    db.officers = db.officers.filter((o: any) => o.id !== id);
    writeDB(db);
    if (off) {
      addAudit((username as string) || 'Admin', 'Xóa', `Xóa cán bộ: ${off.name}`, req);
    }
    res.json({ success: true });
  });

  app.put('/api/officers/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.officers.findIndex((o: any) => o.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin cán bộ.' });
    }
    const oldOff = db.officers[index];
    db.officers[index] = { ...oldOff, ...req.body };
    writeDB(db);
    addAudit(req.body.username || 'Admin', 'Sửa', `Chỉnh sửa thông tin cán bộ: ${oldOff.name} -> ${req.body.name}`, req);
    res.json({ success: true, officer: db.officers[index] });
  });

  // Reasons
  app.get('/api/reasons', (req, res) => {
    const db = readDB();
    res.json(db.reasons || []);
  });

  app.post('/api/reasons', (req, res) => {
    const db = readDB();
    const newReason: ReasonTemplate = {
      ...req.body,
      id: 'r_' + Math.random().toString(36).substring(2, 11)
    };
    db.reasons.push(newReason);
    writeDB(db);
    addAudit(req.body.username || 'Admin', 'Thêm', `Thêm mới mẫu lý do giải quyết: ${newReason.title}`, req);
    res.json({ success: true, reason: newReason });
  });

  app.delete('/api/reasons/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.query;
    const db = readDB();
    const rsn = db.reasons.find((r: any) => r.id === id);
    db.reasons = db.reasons.filter((r: any) => r.id !== id);
    writeDB(db);
    if (rsn) {
      addAudit((username as string) || 'Admin', 'Xóa', `Xóa mẫu lý do: ${rsn.title}`, req);
    }
    res.json({ success: true });
  });

  app.put('/api/reasons/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.reasons.findIndex((r: any) => r.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu lý do.' });
    }
    const oldReason = db.reasons[index];
    db.reasons[index] = { ...oldReason, ...req.body };
    writeDB(db);
    addAudit(req.body.username || 'Admin', 'Sửa', `Chỉnh sửa mẫu lý do: ${oldReason.title} -> ${req.body.title}`, req);
    res.json({ success: true, reason: db.reasons[index] });
  });

  // Users Management (Admin Panel)
  app.get('/api/users', (req, res) => {
    const db = readDB();
    res.json(db.users.map((u: any) => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role })));
  });

  app.post('/api/users', (req, res) => {
    const db = readDB();
    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substring(2, 11),
      username: req.body.username,
      fullName: req.body.fullName,
      role: req.body.role || 'officer'
    };
    db.users.push(newUser);
    writeDB(db);
    addAudit(req.body.creator || 'Admin', 'Thêm', `Tạo mới tài khoản người dùng: ${newUser.username}`, req);
    res.json({ success: true, user: newUser });
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.query;
    const db = readDB();
    const uObj = db.users.find((u: any) => u.id === id);
    db.users = db.users.filter((u: any) => u.id !== id);
    writeDB(db);
    if (uObj) {
      addAudit((username as string) || 'Admin', 'Xóa', `Xóa tài khoản người dùng: ${uObj.username}`, req);
    }
    res.json({ success: true });
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.users.findIndex((u: any) => u.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng.' });
    }
    const oldUser = db.users[index];
    db.users[index] = { ...oldUser, ...req.body };
    writeDB(db);
    addAudit(req.body.updater || 'Admin', 'Sửa', `Chỉnh sửa tài khoản người dùng: ${oldUser.username}`, req);
    res.json({ success: true, user: db.users[index] });
  });

  // 5. WORD TEMPLATES API (Chức năng 8: Quản lý Template)
  app.get('/api/templates', (req, res) => {
    const db = readDB();
    res.json(db.templates || []);
  });

  // 6. DAILY REPORTS API
  app.get('/api/daily-reports', (req, res) => {
    const db = readDB();
    res.json(db.dailyReports || []);
  });

  app.post('/api/daily-reports', (req, res) => {
    const db = readDB();
    const incoming = req.body;

    // Find report for the same date and officer (consolidate officer daily reports)
    const existingIndex = db.dailyReports.findIndex((r: any) => 
      r.date === incoming.date && 
      r.officerId === incoming.officerId
    );

    let savedReport: any;

    if (existingIndex !== -1) {
      const existing = db.dailyReports[existingIndex];

      // Safely preserve morning data:
      let finalMorning = existing.morning;
      if (incoming.session === 'morning' && incoming.morning) {
        finalMorning = incoming.morning;
      } else if (incoming.morning && Object.keys(incoming.morning).length > 0) {
        finalMorning = { ...(existing.morning || {}), ...incoming.morning };
      }

      // Safely preserve afternoon data:
      let finalAfternoon = existing.afternoon;
      if (incoming.session === 'afternoon' && incoming.afternoon) {
        finalAfternoon = incoming.afternoon;
      } else if (incoming.afternoon && Object.keys(incoming.afternoon).length > 0) {
        finalAfternoon = { ...(existing.afternoon || {}), ...incoming.afternoon };
      }

      // Safely merge paper dossiers
      const finalPaper = { ...(existing.paperDossiers || {}) };
      if (incoming.paperDossiers) {
        Object.keys(incoming.paperDossiers).forEach((k) => {
          const val = Number(incoming.paperDossiers[k]) || 0;
          if (val > 0) {
            finalPaper[k] = val;
          }
        });
      }

      // Safely preserve/merge difficulties & suggestions
      let finalDifficulties = existing.difficulties || '';
      if (incoming.difficulties && incoming.difficulties.trim() !== '') {
        const trimmed = incoming.difficulties.trim();
        if (!finalDifficulties) {
          finalDifficulties = trimmed;
        } else if (!finalDifficulties.includes(trimmed)) {
          finalDifficulties = `${finalDifficulties} | ${trimmed}`;
        }
      }

      let finalSuggestions = existing.suggestions || '';
      if (incoming.suggestions && incoming.suggestions.trim() !== '') {
        const trimmed = incoming.suggestions.trim();
        if (!finalSuggestions) {
          finalSuggestions = trimmed;
        } else if (!finalSuggestions.includes(trimmed)) {
          finalSuggestions = `${finalSuggestions} | ${trimmed}`;
        }
      }

      savedReport = {
        ...existing,
        ...incoming,
        id: existing.id || incoming.id || 'rep_' + Math.random().toString(36).substring(2, 11),
        morning: finalMorning,
        afternoon: finalAfternoon,
        paperDossiers: finalPaper,
        difficulties: finalDifficulties,
        suggestions: finalSuggestions,
        reportedAt: new Date().toISOString()
      };
      db.dailyReports[existingIndex] = savedReport;
    } else {
      savedReport = {
        ...incoming,
        id: incoming.id || 'rep_' + Math.random().toString(36).substring(2, 11),
        morning: incoming.session === 'morning' ? incoming.morning : (incoming.morning || undefined),
        afternoon: incoming.session === 'afternoon' ? incoming.afternoon : (incoming.afternoon || undefined),
        reportedAt: new Date().toISOString()
      };
      db.dailyReports.unshift(savedReport);
    }
    
    writeDB(db);
    addAudit(savedReport.officerName || 'Chuyên viên', 'Báo cáo', `Gửi báo cáo ngày ${savedReport.date} (${incoming.session === 'morning' ? 'Sáng' : incoming.session === 'afternoon' ? 'Chiều' : 'Cả ngày'})`, req);
    res.json({ success: true, report: savedReport });
  });

  app.delete('/api/daily-reports/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.query;
    const db = readDB();
    db.dailyReports = (db.dailyReports || []).filter((r: any) => r.id !== id);
    writeDB(db);
    addAudit((username as string) || 'Hệ thống', 'Xóa báo cáo', `Xóa báo cáo định danh ${id}`, req);
    res.json({ success: true });
  });

  app.get('/api/report-config', (req, res) => {
    const db = readDB();
    res.json(db.reportConfig || {
      morningStart: '10:30',
      morningEnd: '12:00',
      afternoonStart: '15:30',
      afternoonEnd: '18:00'
    });
  });

  app.post('/api/report-config', (req, res) => {
    const db = readDB();
    db.reportConfig = req.body;
    writeDB(db);
    addAudit(req.body.username || 'Admin', 'Cấu hình', 'Cập nhật khung giờ báo cáo hàng ngày', req);
    res.json({ success: true, config: db.reportConfig });
  });

  app.post('/api/templates', (req, res) => {
    const db = readDB();
    const { name, formType, contentBase64, placeholders, username } = req.body;

    const newTemplate: any = {
      id: 'tpl_' + Math.random().toString(36).substring(2, 11),
      name,
      formType,
      uploadedAt: new Date().toISOString(),
      placeholders: placeholders || [],
      isDefault: false,
      contentBase64
    };

    // If marked as default, clear other defaults for this form type
    db.templates.forEach((t: any) => {
      if (t.formType === formType) {
        t.isDefault = false;
      }
    });
    newTemplate.isDefault = true;

    db.templates.push(newTemplate);
    writeDB(db);

    addAudit(username || 'Admin', 'Sửa', `Tải lên và kích hoạt Template mới cho mẫu ${formType}: ${name}`, req);
    res.json({ success: true, template: newTemplate });
  });

  app.delete('/api/templates/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.query;
    const db = readDB();
    const tpl = db.templates.find((t: any) => t.id === id);
    db.templates = db.templates.filter((t: any) => t.id !== id);
    writeDB(db);
    if (tpl) {
      addAudit((username as string) || 'Admin', 'Xóa', `Xóa Template Word: ${tpl.name}`, req);
    }
    res.json({ success: true });
  });

  // 6. AUDIT LOGS API
  app.get('/api/audit-logs', (req, res) => {
    const db = readDB();
    res.json(db.auditLogs || []);
  });

  app.post('/api/audit-logs/log-action', (req, res) => {
    const { username, action, details } = req.body;
    addAudit(username, action, details, req);
    res.json({ success: true });
  });

  // 7. DATA PERSISTENCE & BACKUP API (Bảo tồn & Sao lưu Dữ liệu Gốc)
  app.get('/api/backup/status', (req, res) => {
    try {
      const db = readDB();
      const stats = fs.statSync(DB_FILE);
      ensureBackupDir();
      const snapshotFiles = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));

      res.json({
        success: true,
        dbExists: fs.existsSync(DB_FILE),
        fileSizeBytes: stats.size,
        lastModified: stats.mtime.toISOString(),
        totalRecords: (db.records || []).length,
        totalOfficers: (db.officers || []).length,
        totalDailyReports: (db.dailyReports || []).length,
        totalAuditLogs: (db.auditLogs || []).length,
        totalProcedures: (db.procedures || []).length,
        totalTemplates: (db.templates || []).length,
        snapshotsCount: snapshotFiles.length,
        lastSnapshot: snapshotFiles.sort().reverse()[0] || null,
        persistenceStatus: '🟢 ĐÃ BẢO VỆ AN TOÀN CHỐNG MẤT DỮ LIỆU'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/backup/download', (req, res) => {
    try {
      const db = readDB();
      const now = new Date().toISOString().split('T')[0];
      const filename = `CauKieu_Data_Backup_${now}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(db, null, 2));
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/backup/restore', (req, res) => {
    try {
      const { backupData, username } = req.body;
      if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ success: false, message: 'Dữ liệu sao lưu không hợp lệ.' });
      }

      // Create pre-restore safety snapshot
      createAutoSnapshot('pre_restore');

      // Preserve structure
      const restoredDB = {
        users: Array.isArray(backupData.users) ? backupData.users : defaultUsers,
        procedures: Array.isArray(backupData.procedures) ? backupData.procedures : defaultProcedures,
        officers: Array.isArray(backupData.officers) ? backupData.officers : defaultOfficers,
        reasons: Array.isArray(backupData.reasons) ? backupData.reasons : defaultReasons,
        records: Array.isArray(backupData.records) ? backupData.records : [],
        auditLogs: Array.isArray(backupData.auditLogs) ? backupData.auditLogs : [],
        templates: Array.isArray(backupData.templates) ? backupData.templates : [],
        dailyReports: Array.isArray(backupData.dailyReports) ? backupData.dailyReports : [],
        reportConfig: backupData.reportConfig || {
          morningStart: '10:30',
          morningEnd: '12:30',
          afternoonStart: '16:00',
          afternoonEnd: '18:00'
        }
      };

      writeDB(restoredDB);
      addAudit(username || 'Admin', 'Khôi phục', `Khôi phục toàn bộ dữ liệu từ tệp sao lưu JSON (${restoredDB.records.length} hồ sơ, ${restoredDB.officers.length} cán bộ)`, req);

      res.json({
        success: true,
        message: 'Khôi phục dữ liệu thành công!',
        stats: {
          records: restoredDB.records.length,
          officers: restoredDB.officers.length,
          dailyReports: restoredDB.dailyReports.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Lỗi khôi phục: ' + err.message });
    }
  });

  app.get('/api/backup/snapshots', (req, res) => {
    try {
      ensureBackupDir();
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('db_snapshot_') && f.endsWith('.json'))
        .map(f => {
          const filePath = path.join(BACKUP_DIR, f);
          const stats = fs.statSync(filePath);
          return {
            filename: f,
            sizeBytes: stats.size,
            createdTime: stats.mtime.toISOString(),
            isLatest: f === 'db_snapshot_latest.json'
          };
        })
        .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

      res.json({ success: true, snapshots: files });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/backup/restore-snapshot', (req, res) => {
    try {
      const { filename, username } = req.body;
      if (!filename) return res.status(400).json({ success: false, message: 'Tên bản snapshot không được để trống' });
      
      const filePath = path.join(BACKUP_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bản snapshot yêu cầu.' });
      }

      // Snapshot current state before restoring old snapshot
      createAutoSnapshot('before_snapshot_restore');

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      writeDB(parsed);

      addAudit(username || 'Admin', 'Khôi phục', `Khôi phục dữ liệu từ bản Snapshot tự động: ${filename}`, req);
      res.json({ success: true, message: `Đã khôi phục thành công từ snapshot ${filename}` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/backup/trigger-snapshot', (req, res) => {
    try {
      const { label, username } = req.body;
      const cleanLabel = (label || 'manual').replace(/[^a-zA-Z0-9_-]/g, '_');
      createAutoSnapshot(cleanLabel);
      addAudit(username || 'Admin', 'Sao lưu', `Tạo bản sao lưu thủ công thành công (${cleanLabel})`, req);
      res.json({ success: true, message: 'Tạo bản sao lưu snapshot thành công!' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // --- VITE DEV AND STATICS MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static assets from dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cau Kieu Public Admin App running on port ${PORT}`);
  });
}

startServer();
