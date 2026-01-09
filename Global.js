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
  'attendance_hr', 'attendance_subject', 'semesters', 'teacher_config'
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