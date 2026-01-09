// =========================
// 教科担任用データ取得
// =========================
function getSubjectMonthData(params) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const allData = getAllSheetData_(ss);

  const grade = String(params.grade);
  const className = String(params.className);
  const subjectId = String(params.subjectId);
  const year = Number(params.year);
  const month = Number(params.month);
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
  let unitCount = 0;
  const subjectTimetable = {};
  timetable.forEach(t => {
    if (t.subjectId === subjectId) {
      unitCount++;
      if (!subjectTimetable[t.weekday]) subjectTimetable[t.weekday] = [];
      subjectTimetable[t.weekday].push(t.period);
    }
  });
  const subjRow = allData['subjects'].find(r => String(r.subjectId) === subjectId);
  const subj = subjRow
    ?
    { subjectId: String(subjRow.subjectId), subjectName: subjRow.subjectName, units: unitCount }
    : { subjectId: subjectId, subjectName: subjectId, units: unitCount };
  const daysRaw = generateCalendarData_(year, month, allData['calendar']);

  const attRows = allData['attendance_subject'].filter(r =>
    String(r.grade) === grade &&
    String(r.class) === className &&
    String(r.subjectId) === subjectId
  );
  const totalAbsentMap = {};
  const attMap = {};

  const targetYM = new Date(year, month - 1, 1);
  const nextYM = new Date(year, month, 1);

  attRows.forEach(r => {
    const n = String(r.number || r.studentId);
    const stat = r.status;
    const dStr = dateToKey_(r.date);

    if (stat === '欠課' || stat === '欠席') {
      totalAbsentMap[n] = (totalAbsentMap[n] || 0) + 1;
    }

    const dObj = new Date(r.date);
    if (dObj >= targetYM && dObj < nextYM) {
      const p = String(r.period);
      attMap[`${dStr}__${p}__${n}`] = {
        status: stat
      };
    }
  });

  const days = [];
  daysRaw.forEach(d => {
    const isHoliday = !d.isSchoolday;
    const isNoClass = d.isNoClassDay;
    const validPeriods = d.validPeriods;

    const scheduledPeriods = (!isHoliday && !isNoClass) ? (subjectTimetable[d.dow] || []) : [];

    if (scheduledPeriods.length > 0) {
      scheduledPeriods.forEach(p => {
        let isCancelled = false;
        if (validPeriods && !validPeriods.includes(p)) {
          isCancelled = true;
        }

        days.push({
          date: d.date,
          dow: d.dow,
          period: p,
          label: `${parseInt(d.date.slice(-2))}日(${p})`,
          isSchoolday: !isHoliday,
          isNoClassDay: isNoClass || isCancelled,
          remark: d.remark,
          validPeriods: validPeriods
        });
      });
    } else {
      days.push({
        date: d.date,
        dow: d.dow,
        period: -1,
        label: `${parseInt(d.date.slice(-2))}日`,
        isSchoolday: !isHoliday,
        isNoClassDay: true,
        remark: d.remark,
        validPeriods: validPeriods
      });
    }
  });

  return {
    subject: subj,
    students,
    days,
    attendance: attMap,
    totalAbsentMap
  };
}

function saveSubjectAttendance(payload) {
  return saveAttendanceCommon_('attendance_subject', payload, ['date', 'subjectId', 'grade', 'class', 'period', 'number', 'status']);
}