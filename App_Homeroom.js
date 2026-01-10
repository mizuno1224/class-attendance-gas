// =========================
// クラス担任用データ取得
// =========================

function getHomeroomViewData(params) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const requiredSheets = ['students', 'timetable', 'subjects', 'calendar', 'attendance_hr', 'daily_timetable_changes'];
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

  // 日ごとの変更情報を取得
  const dailyChanges = allData['daily_timetable_changes']
    .filter(r => String(r.grade) === grade && String(r.class) === className)
    .map(r => ({
        date: dateToKey_(r.date),
        period: Number(r.period),
        subjectId: String(r.subjectId)
    }));
  const dailyOverrides = {};
  dailyChanges.forEach(r => {
      if(!dailyOverrides[r.date]) dailyOverrides[r.date] = {};
      dailyOverrides[r.date][r.period] = r.subjectId;
  });

  const unitsCount = {};
  timetable.forEach(t => {
    unitsCount[t.subjectId] = (unitsCount[t.subjectId] || 0) + 1;
  });

  const subjectsMap = {};
  allData['subjects'].forEach(r => {
    const id = String(r.subjectId);
    subjectsMap[id] = {
      subjectId: id,
      subjectName: id, // ★修正: IDを名前として使用
      units: unitsCount[id] || 0
    };
  });

  const daysRaw = generateCalendarData_(year, month, allData['calendar']);
  const days = daysRaw.map(d => {
      d.override = dailyOverrides[d.date] || null;
      return d;
  });

  const attAll = allData['attendance_hr']
    .filter(r => String(r.grade) === grade && String(r.class) === className)
    .map(r => ({
      date: dateToKey_(r.date),
      number: String(r.number || r.studentId),
      status: r.status || '',
      periods: r.periods || '',
      memo: r.memo || ''
    }));

  const attMap = [];
  const targetYM = new Date(year, month - 1, 1);
  const nextYM = new Date(year, month, 1);
  
  attAll.forEach(r => {
    const dObj = new Date(r.date);
    if (dObj >= targetYM && dObj < nextYM) {
      attMap.push(r);
    }
  });

  return {
    students: students,
    days: days,
    attendance: attMap,
    subjects: subjectsMap,
    timetable: timetable,
    dailyOverrides: dailyOverrides
  };
}

function saveHomeroomAttendance(payload) {
  return saveAttendanceCommon_('attendance_hr', payload.records, ['date', 'grade', 'class', 'number', 'status', 'periods', 'memo'], payload.grade, payload.className);
}