'use strict';

const STORAGE_KEY = 'hsc-5n403-admin-v2';
const AUTH_KEY = 'hsc-5n403-admin-auth-v1';
const ADMIN_PASSWORD = '403403';

const semesterStart = parseDate('2026-09-14');
const semesterEnd = parseDate('2027-01-15');
const internshipStart = parseDate('2026-10-05');
const internshipEnd = parseDate('2026-10-25');

const manageRequested = new URLSearchParams(location.search).get('manage') === '1';
let isAdmin = false;
if (manageRequested) {
  let authenticated = sessionStorage.getItem(AUTH_KEY) === '1';
  if (!authenticated) {
    authenticated = window.prompt('請輸入5N403學藝管理密碼') === ADMIN_PASSWORD;
    if (authenticated) sessionStorage.setItem(AUTH_KEY, '1');
  }
  if (authenticated) {
    isAdmin = true;
  } else {
    history.replaceState({}, '', location.pathname + location.hash);
  }
}

const periods = {
  1: '08:10–09:00',
  2: '09:10–10:00',
  3: '10:10–11:00',
  4: '11:10–12:00',
  5: '12:50–13:40',
  6: '13:45–14:35',
  7: '14:50–15:40',
  8: '15:45–16:35'
};

const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五'];
const dayClasses = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const colors = {
  '其他': '#718096',
  '護理倫理與法律': '#7554b7',
  '體育（七）': '#3d995c',
  '精神科護理學': '#3d7ec0',
  '兒科護理學進階': '#d06d38',
  '兒科護理學實驗': '#c45b56',
  '通識課程': '#b78312',
  '內外科護理學進階': '#2b837b',
  '原住民健康促進': '#b67911',
  '社區護理學進階': '#b34d83',
  '停課': '#9c5b55',
  '調課': '#7a58a5',
  '補課': '#2b837b',
  '活動': '#af7b18',
  '考試': '#774e91',
  '放假': '#b94e47'
};

// 正確固定課表：星期二第7–8節「其他」；星期五第1–2節「通識課程」。
const defaultFixed = [
  [],
  [
    { id: 'f-tu-12', start: 1, end: 2, title: '護理倫理與法律', teacher: '陳鳳音', room: '' },
    { id: 'f-tu-3', start: 3, end: 3, title: '體育（七）', teacher: '施瑩悌', room: '' },
    { id: 'f-tu-56', start: 5, end: 6, title: '精神科護理學', teacher: '張銀玲', room: '' },
    { id: 'f-tu-78', start: 7, end: 8, title: '其他', teacher: '', room: '' }
  ],
  [],
  [
    { id: 'f-th-1', start: 1, end: 1, title: '精神科護理學', teacher: '張銀玲', room: '' },
    { id: 'f-th-2', start: 2, end: 2, title: '兒科護理學進階', teacher: '林素雯', room: '' },
    { id: 'f-th-34', start: 3, end: 4, title: '兒科護理學實驗', teacher: '林素雯', room: '兒科示範教室' }
  ],
  [
    { id: 'f-fr-12', start: 1, end: 2, title: '通識課程', teacher: '', room: '' },
    { id: 'f-fr-34', start: 3, end: 4, title: '內外科護理學進階', teacher: '王淑真', room: '' },
    { id: 'f-fr-56', start: 5, end: 6, title: '原住民健康促進', teacher: '楊金蘭', room: '' },
    { id: 'f-fr-78', start: 7, end: 8, title: '社區護理學進階', teacher: '李淑惠', room: '' }
  ]
];

const defaultChanges = [
  { id: 'c-reg', date: '2026-09-14', type: '活動', start: 'all', end: 'all', title: '註冊日', teacher: '', room: '', note: '依學校十八週課表' },
  { id: 'c-mid', date: '2026-09-25', type: '放假', start: 'all', end: 'all', title: '中秋節放假', teacher: '', room: '', note: '全天放假' },
  { id: 'c-teacher', date: '2026-09-28', type: '放假', start: 'all', end: 'all', title: '教師節放假', teacher: '', room: '', note: '全天放假' },
  { id: 'c-national', date: '2026-10-09', type: '放假', start: 'all', end: 'all', title: '國慶日補假', teacher: '', room: '', note: '全天放假' },
  { id: 'c-retro', date: '2026-10-26', type: '放假', start: 'all', end: 'all', title: '光復節放假', teacher: '', room: '', note: '全天放假' },
  { id: 'c-school', date: '2026-11-23', type: '放假', start: 'all', end: 'all', title: '校慶日補假', teacher: '', room: '', note: '全天放假' },
  { id: 'c-constitution', date: '2026-12-25', type: '放假', start: 'all', end: 'all', title: '行憲紀念日放假', teacher: '', room: '', note: '全天放假' },
  { id: 'c-newyear', date: '2027-01-01', type: '放假', start: 'all', end: 'all', title: '元旦放假', teacher: '', room: '', note: '全天放假' }
];

const weekNotes = {
  1: ['註冊日', '9/14 註冊日'],
  2: ['放假提醒', '9/25 中秋節放假'],
  3: ['放假提醒', '9/28 教師節放假'],
  4: ['校外實習', '10/5－10/25 校外實習；10/9 國慶日補假'],
  5: ['校外實習', '10/5－10/25 校外實習'],
  6: ['校外實習', '10/5－10/25 校外實習'],
  7: ['返校提醒', '10/26 光復節放假；10/27起恢復校內課程'],
  9: ['期中考週', '實際考試科目、時間與教室依學校公告'],
  11: ['放假提醒', '11/23 校慶日補假'],
  15: ['放假提醒', '12/25 行憲紀念日放假'],
  16: ['放假提醒', '1/1 元旦放假'],
  18: ['期末考週', '實際考試科目、時間與教室依學校公告']
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultState() {
  return {
    v: 3,
    updatedAt: new Date().toISOString(),
    fixed: clone(defaultFixed),
    changes: clone(defaultChanges)
  };
}

function normalizeCourse(course) {
  return {
    id: course.id || uid('f'),
    start: Math.max(1, Math.min(8, Number(course.start) || 1)),
    end: Math.max(1, Math.min(8, Number(course.end) || Number(course.start) || 1)),
    title: String(course.title || '未命名課程'),
    teacher: String(course.teacher || ''),
    room: String(course.room || '')
  };
}

function enforceCorrectFixedSchedule(fixed) {
  while (fixed.length < 5) fixed.push([]);

  // 移除先前誤放在星期一第7–8節的「其他」。
  fixed[0] = fixed[0].filter(c => !(
    String(c.title).trim() === '其他' && Number(c.start) === 7 && Number(c.end) === 8
  ));

  // 星期二第7–8節固定為「其他」。
  fixed[1] = fixed[1].filter(c => Number(c.end) < 7 || Number(c.start) > 8);
  fixed[1].push({ id: 'f-tu-78', start: 7, end: 8, title: '其他', teacher: '', room: '' });

  // 星期五第1–2節固定為「通識課程」。
  fixed[4] = fixed[4].filter(c => Number(c.end) < 1 || Number(c.start) > 2);
  fixed[4].push({ id: 'f-fr-12', start: 1, end: 2, title: '通識課程', teacher: '', room: '' });

  fixed.forEach(day => day.sort((a, b) => Number(a.start) - Number(b.start)));
  return fixed;
}

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return defaultState();

  let fixed = Array.isArray(raw.fixed) && raw.fixed.length === 5
    ? raw.fixed.map(day => Array.isArray(day) ? day.map(normalizeCourse) : [])
    : clone(defaultFixed);
  fixed = enforceCorrectFixedSchedule(fixed);

  const changes = Array.isArray(raw.changes) ? raw.changes.map(change => ({
    id: change.id || uid('c'),
    date: String(change.date || ''),
    type: String(change.type || '活動'),
    start: change.start === 'all' ? 'all' : Math.max(1, Math.min(8, Number(change.start) || 1)),
    end: change.end === 'all' ? 'all' : Math.max(1, Math.min(8, Number(change.end) || Number(change.start) || 1)),
    title: String(change.title || change.type || '活動'),
    teacher: String(change.teacher || ''),
    room: String(change.room || ''),
    note: String(change.note || '')
  })) : clone(defaultChanges);

  return {
    v: 3,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    fixed,
    changes
  };
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function iso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function md(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function weekStart(week) {
  return addDays(semesterStart, (week - 1) * 7);
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function fmtDateTime(value) {
  try {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function isInternship(date) {
  return date >= internshipStart && date <= internshipEnd;
}

function periodLabel(course) {
  if (course.start === 'all') return '全天';
  return Number(course.start) === Number(course.end)
    ? `第${course.start}節`
    : `第${course.start}–${course.end}節`;
}

function timeLabel(course) {
  if (course.start === 'all') return '全天';
  return Number(course.start) === Number(course.end)
    ? periods[course.start]
    : `${periods[course.start].split('–')[0]}–${periods[course.end].split('–')[1]}`;
}

function weekOfDate(value) {
  const date = parseDate(value);
  return Math.floor((date - semesterStart) / (7 * 86400000)) + 1;
}

function currentWeekNumber() {
  const diff = Math.floor((new Date() - semesterStart) / (7 * 86400000)) + 1;
  return Math.min(18, Math.max(1, diff));
}

function toBase64Url(object) {
  const bytes = new TextEncoder().encode(JSON.stringify(object));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  let encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  while (encoded.length % 4) encoded += '=';
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
