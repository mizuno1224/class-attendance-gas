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

  return {
    config,
    semesters,
    initialDate: { year, month },
    initialHrData,
    allSubjects: allData['subjects']
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
        subjectName: String(r.subjectName)
      });
    }
  });
  if (!config.HR.grade && config.ASSIGNED_SUBJECTS.length === 0) return DEFAULT_CONFIG;
  return config;
}

function getSemestersFromData_(rows) {
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
  createSheetIfNotExists_(ss, SHEET_NAMES[2], ['subjectId', 'subjectName']);
  createSheetIfNotExists_(ss, SHEET_NAMES[3], ['date', 'isSchoolday', 'isNoClassDay', 'remark', 'validPeriods']);
  createSheetIfNotExists_(ss, SHEET_NAMES[4], ['date', 'grade', 'class', 'number', 'status', 'periods', 'memo']);
  createSheetIfNotExists_(ss, SHEET_NAMES[5], ['date', 'subjectId', 'grade', 'class', 'period', 'number', 'status']);
  createSheetIfNotExists_(ss, SHEET_NAMES[6], ['semesterName', 'startDate', 'endDate']);
  createSheetIfNotExists_(ss, SHEET_NAMES[7], ['type', 'grade', 'class', 'subjectId', 'subjectName']);

  const semSh = ss.getSheetByName(SHEET_NAMES[6]);
  if (semSh.getLastRow() === 1) {
    const y = new Date().getFullYear();
    semSh.getRange(2, 1, 3, 3).setValues([
      ['1学期', `${y}-04-01`, `${y}-07-31`], ['2学期', `${y}-09-01`, `${y}-12-25`], ['3学期', `${y + 1}-01-08`, `${y + 1}-03-24`]
    ]);
  }
  const confSh = ss.getSheetByName(SHEET_NAMES[7]);
  if (confSh.getLastRow() === 1) {
    confSh.getRange(2, 1, 2, 5).setValues([
      ['HR', '1', '2', '', ''],
      ['SUBJECT', '1', '2', 'MATH1', '数学Ⅰ']
    ]);
  }
  SpreadsheetApp.getUi().alert('シート作成完了');
}