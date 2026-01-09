// カレンダー設定画面用のデータ取得
function getCalendarSettingsViewData(year, month) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName('calendar');
  let calendarRows = [];
  if (sh) {
    const range = sh.getDataRange();
    const vals = range.getValues();
    if (vals.length > 0) {
      const header = vals[0];
      calendarRows = vals.slice(1).map(row => {
        const obj = {};
        header.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    }
  }
  return generateCalendarData_(year, month, calendarRows);
}

function generateCalendarData_(year, month, calendarRows) {
  const calMap = {};
  calendarRows.forEach(r => {
    const k = dateToKey_(r.date);
    let vp = null;
    let vpStr = "";
    if (r.validPeriods) {
      const s = String(r.validPeriods).replace(/[０-９]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
      });
      vpStr = s;
      vp = s.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n));
    }
    calMap[k] = {
      isEntryExists: true,
      isSchoolday: Boolean(r.isSchoolday),
      isNoClassDay: Boolean(r.isNoClassDay),
      remark: r.remark,
      validPeriods: vp,
      validPeriodsStr: vpStr
    };
  });
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const holidaysMap = getHolidaysMap_(startDate, new Date(year, month, 1));

  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = dateToKey_(d);
    const dow = d.getDay();
    const isHoliday = holidaysMap[key];

    let isSchoolday, isNoClassDay, remark, validPeriods, validPeriodsStr;
    if (calMap[key]) {
      const c = calMap[key];
      isSchoolday = c.isSchoolday;
      isNoClassDay = c.isNoClassDay;
      remark = c.remark;
      validPeriods = c.validPeriods;
      validPeriodsStr = c.validPeriodsStr;
    } else {
      if (dow === 0 || dow === 6 || isHoliday) {
        isSchoolday = false;
        isNoClassDay = false;
      } else {
        isSchoolday = true;
        isNoClassDay = false;
      }
      remark = isHoliday ? '祝日' : '';
      validPeriods = null;
      validPeriodsStr = "";
    }

    days.push({
      date: key,
      dow: dow,
      isSchoolday: isSchoolday,
      isNoClassDay: isNoClassDay,
      remark: remark || '',
      validPeriods: validPeriods,
      validPeriodsStr: validPeriodsStr || ''
    });
  }
  return days;
}

function getHolidaysMap_(start, end) {
  const map = {};
  try {
    const calId = 'ja.japanese#holiday@group.v.calendar.google.com';
    const cal = CalendarApp.getCalendarById(calId);
    if (cal) {
      const events = cal.getEvents(start, end);
      events.forEach(e => {
        const k = dateToKey_(e.getStartTime());
        map[k] = true;
      });
    }
  } catch (e) {
    console.error('Calendar access failed:', e);
  }
  return map;
}

function saveCalendarBulk(records) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName('calendar');
  if (!sh) throw new Error('カレンダーシートが見つかりません');
  let header = [];
  const lastRow = sh.getLastRow();
  if (lastRow === 0) {
    header = ['date', 'isSchoolday', 'isNoClassDay', 'remark', 'validPeriods'];
    sh.appendRow(header);
  } else {
    header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  }
  const idx = {};
  header.forEach((h, i) => (idx[h] = i));

  const range = sh.getDataRange();
  const values = range.getValues();
  const dateToRow = {};
  for (let i = 1; i < values.length; i++) {
    const dKey = dateToKey_(values[i][idx.date]);
    if (dKey) dateToRow[dKey] = i + 1;
  }

  const toUpdate = [];
  const toAppend = [];
  records.forEach(rec => {
    const dKey = rec.date;
    const rowNum = dateToRow[dKey];

    const rowData = new Array(header.length).fill('');
    header.forEach((col, i) => {
      if (col === 'date') rowData[i] = rec.date;
      else if (col === 'isSchoolday') rowData[i] = rec.isSchoolday;
      else if (col === 'isNoClassDay') rowData[i] = rec.isNoClassDay;
      else if (col === 'remark') rowData[i] = rec.remark;
      else if (col === 'validPeriods') rowData[i] = rec.validPeriods;
    });


    if (rowNum) {
      toUpdate.push({ row: rowNum, values: rowData });
    } else {
      toAppend.push(rowData);
    }
  });
  toUpdate.forEach(item => {
    sh.getRange(item.row, 1, 1, header.length).setValues([item.values]);
  });
  if (toAppend.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, header.length).setValues(toAppend);
  }

  return { success: true };
}