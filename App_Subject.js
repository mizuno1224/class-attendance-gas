// =========================
// 教科担任用データ取得
// =========================
function getSubjectMonthData(params) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const requiredSheets = ['students', 'timetable', 'subjects', 'calendar', 'attendance_subject', 'semesters', 'daily_timetable_changes'];
  const allData = getAllSheetData_(ss, requiredSheets);

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
  const subj = { 
      subjectId: subjectId, 
      subjectName: subjectId, // ★修正: IDを名前として使用
      units: unitCount 
  };

  const daysRaw = generateCalendarData_(year, month, allData['calendar']);

  const attRows = allData['attendance_subject'].filter(r =>
    String(r.grade) === grade &&
    String(r.class) === className &&
    String(r.subjectId) === subjectId
  );

  // 年度範囲（1学期開始～最終学期終了）で科目別欠課を年度累積にする
  var yearStart = null;
  var yearEnd = null;
  var semesters = (allData['semesters'] || []).map(function(r) {
    return { start: dateToKey_(r.startDate), end: dateToKey_(r.endDate) };
  });
  if (semesters.length > 0) {
    yearStart = semesters[0].start;
    yearEnd = semesters[semesters.length - 1].end;
  }

  const totalAbsentMap = {};
  const attMap = {};
  // タイムゾーンに依存しないよう、年月は文字列 "YYYY-MM-DD" で比較する（1学期など他学期の記録が漏れないように）
  const pad = function(n) { return ('0' + n).slice(-2); };
  const targetYMStr = year + '-' + pad(month) + '-01';
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const nextYMStr = nextMonth.y + '-' + pad(nextMonth.m) + '-01';

  attRows.forEach(r => {
    const n = String(r.number || r.studentId);
    const stat = r.status;
    const dStr = dateToKey_(r.date);
    const dateStr = dStr.slice(0, 10);

    // 科目別欠課数は年度累積（年度範囲内の欠課・欠席のみカウント）
    if ((stat === '欠課' || stat === '欠席') && yearStart && yearEnd && dateStr >= yearStart && dateStr <= yearEnd) {
      totalAbsentMap[n] = (totalAbsentMap[n] || 0) + 1;
    }

    if (dateStr >= targetYMStr && dateStr < nextYMStr) {
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
    const override = dailyOverrides[d.date];
    
    let activePeriods = [];
    for(let p=1; p<=7; p++) {
        let sId = '';
        if (override && override[p] !== undefined) {
            sId = override[p];
        } else {
            const rec = timetable.find(t => t.weekday === d.dow && t.period === p);
            if (rec) sId = rec.subjectId;
        }
        
        if (sId === subjectId) {
            activePeriods.push(p);
        }
    }

    if ((!isHoliday && !isNoClass) || (override && activePeriods.length > 0)) {
        if (activePeriods.length > 0) {
           activePeriods.forEach(p => {
               let isCancelled = false;
               if (validPeriods && !validPeriods.includes(p)) isCancelled = true;
               days.push({
                   date: d.date,
                   dow: d.dow,
                   period: p,
                   label: `${parseInt(d.date.slice(-2))}日(${p})`,
                   isSchoolday: !isHoliday,
                   isNoClassDay: isNoClass || isCancelled,
                   remark: d.remark,
                   validPeriods: validPeriods,
                   override: override
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
                validPeriods: validPeriods,
                override: override
            });
        }
    } else {
        days.push({
            date: d.date,
            dow: d.dow,
            period: -1,
            label: `${parseInt(d.date.slice(-2))}日`,
            isSchoolday: !isHoliday,
            isNoClassDay: true,
            remark: d.remark,
            validPeriods: validPeriods,
            override: override
        });
    }
  });

  let remainingClasses = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = dateToKey_(today);

  const currentSemester = semesters.find(s => todayStr >= s.start && todayStr <= s.end);

  if (currentSemester) {
    const semEnd = new Date(currentSemester.end);
    const calMap = {};
    allData['calendar'].forEach(r => calMap[dateToKey_(r.date)] = r);
    const holidayMap = getHolidaysMap_(today, semEnd);
    
    for (let d = new Date(today); d <= semEnd; d.setDate(d.getDate() + 1)) {
      const k = dateToKey_(d);
      const dow = d.getDay();
      const calRow = calMap[k];
      let isSchoolday = true;
      let isNoClassDay = false;
      let validPeriods = null;

      if (calRow) {
        isSchoolday = Boolean(calRow.isSchoolday);
        isNoClassDay = Boolean(calRow.isNoClassDay);
        if (calRow.validPeriods) {
             const s = String(calRow.validPeriods).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
             validPeriods = s.split(',').map(n => Number(n.trim()));
        }
      } else {
        if (dow === 0 || dow === 6 || holidayMap[k]) isSchoolday = false;
      }

      if (isSchoolday && !isNoClassDay) {
        const overrideForDay = dailyOverrides[k];
        for(let p=1; p<=7; p++) {
             let sId = '';
             if (overrideForDay && overrideForDay[p] !== undefined) sId = overrideForDay[p];
             else {
                 const t = timetable.find(tt => tt.weekday === dow && tt.period === p);
                 if(t) sId = t.subjectId;
             }
             
             if (sId === subjectId) {
                 if (!validPeriods || validPeriods.includes(p)) remainingClasses++;
             }
        }
      }
    }
  }

  return {
    subject: subj,
    students,
    days,
    attendance: attMap,
    totalAbsentMap,
    remainingClasses,
    timetable: timetable,
    dailyOverrides: dailyOverrides
  };
}

function getStudentSubjectAbsenceHistory(grade, className, subjectId, studentNum) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName('attendance_subject');
  if (!sh) return [];
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const h = data[0];
  const idx = {}; h.forEach((c, i) => idx[c] = i);
  if (idx.grade === undefined || idx.status === undefined) return [];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[idx.grade]) === String(grade) && 
        String(row[idx.class]) === String(className) &&
        String(row[idx.subjectId]) === String(subjectId) &&
        String(row[idx.number]) === String(studentNum)) {
       const st = row[idx.status];
       if (['欠課','欠席','公欠','忌引','出席停止'].includes(st)) {
         let d = row[idx.date];
         if (d instanceof Date) d = Utilities.formatDate(d, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
         list.push({ date: d, period: row[idx.period], status: st });
       }
    }
  }
  return list.sort((a, b) => a.date < b.date ? 1 : -1);
}

function saveSubjectAttendance(payload) {
  // payload.records の各件に grade, class, subjectId を付与して保存する
  const records = (payload.records || []).map(function(r) {
    return {
      date: r.date,
      subjectId: payload.subjectId,
      grade: payload.grade,
      'class': payload.className,
      period: r.period,
      number: r.number,
      status: r.status
    };
  });
  return saveAttendanceCommon_('attendance_subject', records, ['date', 'subjectId', 'grade', 'class', 'period', 'number', 'status']);
}