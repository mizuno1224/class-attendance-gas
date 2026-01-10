// =========================
// 設定
// =========================

const SS_ID = SpreadsheetApp.getActive().getId();

// デフォルト設定
const DEFAULT_CONFIG = {
  HR: { grade: '1', class: '2' },
  ASSIGNED_SUBJECTS: []
};
const SHEET_NAMES = [
  'students', 'timetable', 'subjects', 'calendar',
  'attendance_hr', 'attendance_subject', 'semesters', 'teacher_config',
  'daily_timetable_changes'
];

// =========================
// HTML エントリポイント
// =========================

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('出席管理アプリ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, user-scalable=no');
}

// =========================
// onOpen：メニュー追加
// =========================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('出席管理アプリ')
    .addItem('初期シートを作成', 'setupAttendanceSheets')
    .addToUi();
}

// =========================
// HTML読み込み用ヘルパー関数
// =========================

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =========================
// 初期データ取得
// =========================

function getInitialData() {
  const ss = SpreadsheetApp.openById(SS_ID);
  const allData = getAllSheetData_(ss);

  const config = getTeacherConfigFromData_(allData['teacher_config']);
  const semesters = getSemestersFromData_(allData['semesters']);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  let initialHrData = null;
  if (config.HR.grade && config.HR.class) {
    initialHrData = getHomeroomDataLogic_(allData, config.HR.grade, config.HR.class, year, month);
  }

  // subjectsシートデータを整形 (ID=Nameとして扱う)
  const allSubjects = (allData['subjects'] || []).map(s => ({
    subjectId: String(s.subjectId),
    subjectName: String(s.subjectId) // IDを名前として使用
  }));

  return {
    config,
    semesters,
    initialDate: { year, month },
    initialHrData,
    allSubjects
  };
}

function getTeacherConfigFromData_(rows) {
  const config = { HR: { grade: '', class: '' }, ASSIGNED_SUBJECTS: [] };
  rows.forEach(r => {
    const type = String(r.type);
    if (type === 'HR') {
      config.HR = { grade: String(r.grade), class: String(r.class) };
    } else if (type === 'SUBJECT') {
      config.ASSIGNED_SUBJECTS.push({
        grade: String(r.grade),
        class: String(r.class),
        subjectId: String(r.subjectId),
        subjectName: String(r.subjectId) // IDを名前として使用
      });
    }
  });
  if (!config.HR.grade && config.ASSIGNED_SUBJECTS.length > 0) {
    const first = config.ASSIGNED_SUBJECTS[0];
    config.HR = { grade: first.grade, class: first.class }; 
  }
  if (!config.HR.grade) config.HR = DEFAULT_CONFIG.HR;
  return config;
}

function getSemestersFromData_(rows) {
  if (!rows || rows.length === 0) return [];
  return rows.map(r => ({
    name: r.semesterName,
    start: dateToKey_(r.startDate),
    end: dateToKey_(r.endDate)
  }));
}

function setupAttendanceSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);
  createSheetIfNotExists_(ss, SHEET_NAMES[0], ['grade', 'class', 'number', 'name']);
  createSheetIfNotExists_(ss, SHEET_NAMES[1], ['grade', 'class', 'weekday', 'period', 'subjectId']);
  createSheetIfNotExists_(ss, SHEET_NAMES[2], ['subjectId']); // ★修正: subjectName削除
  createSheetIfNotExists_(ss, SHEET_NAMES[3], ['date', 'isSchoolday', 'isNoClassDay', 'remark', 'validPeriods']);
  createSheetIfNotExists_(ss, SHEET_NAMES[4], ['date', 'grade', 'class', 'number', 'status', 'periods', 'memo']);
  createSheetIfNotExists_(ss, SHEET_NAMES[5], ['date', 'subjectId', 'grade', 'class', 'period', 'number', 'status']);
  createSheetIfNotExists_(ss, SHEET_NAMES[6], ['semesterName', 'startDate', 'endDate']);
  createSheetIfNotExists_(ss, SHEET_NAMES[7], ['type', 'grade', 'class', 'subjectId']); // ★修正: subjectName削除
  createSheetIfNotExists_(ss, SHEET_NAMES[8], ['date', 'grade', 'class', 'period', 'subjectId']);

  const semSh = ss.getSheetByName(SHEET_NAMES[6]);
  if (semSh.getLastRow() === 1) {
    const y = new Date().getFullYear();
    semSh.getRange(2, 1, 3, 3).setValues([
      ['1学期', `${y}-04-01`, `${y}-07-31`],
      ['2学期', `${y}-09-01`, `${y}-12-25`],
      ['3学期', `${y+1}-01-08`, `${y+1}-03-24`]
    ]);
  }
}

function createSheetIfNotExists_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
}