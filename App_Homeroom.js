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

  // タイムゾーンに依存しないよう、年月は文字列 "YYYY-MM-DD" で比較する（1学期など他学期の記録が漏れないように）
  const pad = function(n) { return ('0' + n).slice(-2); };
  const targetYMStr = year + '-' + pad(month) + '-01';
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const nextYMStr = nextMonth.y + '-' + pad(nextMonth.m) + '-01';

  const attMap = [];
  attAll.forEach(r => {
    const dateStr = String(r.date).slice(0, 10); // "YYYY-MM-DD" 部分のみ
    if (dateStr >= targetYMStr && dateStr < nextYMStr) {
      attMap.push(r);
    }
  });

  return {
    students: students,
    days: days,
    attendance: attMap,
    attendanceYearly: attAll,
    subjects: subjectsMap,
    timetable: timetable,
    dailyOverrides: dailyOverrides
  };
}

// 年度累積用カレンダー（別APIで遅延取得し初回表示を軽量化）
function getHomeroomYearlyCalendar(grade, className) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var requiredSheets = ['calendar', 'semesters'];
  var allData = getAllSheetData_(ss, requiredSheets);
  var daysYearly = [];
  var semesters = (allData['semesters'] || []).map(function(r) {
    return { start: dateToKey_(r.startDate), end: dateToKey_(r.endDate) };
  });
  if (semesters.length > 0) {
    var yearStart = semesters[0].start;
    var yearEnd = semesters[semesters.length - 1].end;
    var startParts = yearStart.split('-').map(Number);
    var endParts = yearEnd.split('-').map(Number);
    var y1 = startParts[0], m1 = startParts[1];
    var y2 = endParts[0], m2 = endParts[1];
    var currY = y1, currM = m1;
    while (currY < y2 || (currY === y2 && currM <= m2)) {
      daysYearly = daysYearly.concat(generateCalendarData_(currY, currM, allData['calendar'] || []));
      if (currM === 12) { currY++; currM = 1; } else { currM++; }
    }
    daysYearly = daysYearly.filter(function(d) {
      var ds = String(d.date).slice(0, 10);
      return ds >= yearStart && ds <= yearEnd;
    });
  }
  return { daysYearly: daysYearly };
}

function saveHomeroomAttendance(payload) {
  // 読み込み時のフィルタ（grade/class）に合致させるため、各レコードに grade と class を付与する
  const records = (payload.records || []).map(function(r) {
    return {
      date: r.date,
      grade: payload.grade,
      'class': payload.className,
      number: r.number,
      status: r.status,
      periods: r.periods || '',
      memo: r.memo || ''
    };
  });
  return saveAttendanceCommon_('attendance_hr', records, ['date', 'grade', 'class', 'number', 'status', 'periods', 'memo']);
}