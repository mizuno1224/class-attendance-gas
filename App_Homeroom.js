// =========================
// クラス担任用データ取得
// =========================

function getHomeroomViewData(params) {
  const ss = SpreadsheetApp.openById(SS_ID);
  // 最適化: 必要なシートのみ指定して読み込み
  const requiredSheets = ['students', 'timetable', 'subjects', 'calendar', 'attendance_hr'];
  const allData = getAllSheetData_(ss, requiredSheets);
  return getHomeroomDataLogic_(allData, params.grade, params.className, Number(params.year), Number(params.month));
}

function getHomeroomDataLogic_(allData, grade, className, year, month) {
  grade = String(grade);
  className = String(className);
  const students = allData['students']
    .filter(r => String(r.grade) === grade && String(r.class) === className)
    .map(r => ({ number: String(r.number), name: r.name }))
    .sort((a, b) => Number(a.number) - Number(b.number));
  const timetable = allData['timetable']
    .filter(r => String(r.grade) === grade && String(r.class) === className)
    .map(r => ({
      weekday: Number(r.weekday),
      period: Number(r.period),
      subjectId: String(r.subjectId)
    }));
  const unitsCount = {};
  timetable.forEach(t => {
    unitsCount[t.subjectId] = (unitsCount[t.subjectId] || 0) + 1;
  });
  const subjectsMap = {};
  allData['subjects'].forEach(r => {
    const id = String(r.subjectId);
    subjectsMap[id] = {
      subjectId: id,
      subjectName: r.subjectName,
      units: unitsCount[id] || 0
    };
  });
  const days = generateCalendarData_(year, month, allData['calendar']);

  const attAll = allData['attendance_hr']
    .filter(r => String(r.grade) === grade && String(r.class) === className)
    .map(r => ({
      date: dateToKey_(r.date),
      number: String(r.number || r.studentId),
      status: r.status || '',
      periods: String(r.periods || ''),
      memo: r.memo || ''
    }));
  return {
    students,
    days,
    attendance: attAll,
    timetable,
    subjects: subjectsMap
  };
}

function saveHomeroomAttendance(payload) {
  return saveAttendanceCommon_('attendance_hr', payload, ['date', 'grade', 'class', 'number', 'status', 'periods', 'memo']);
}