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
  // DBのデータをマップ化
  const calMap = {};
  // シートの TRUE/FALSE が文字列で返る場合に対応
  function parseBool(v) {
    if (v === true || v === false) return v;
    const s = String(v).toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }
  calendarRows.forEach(r => {
    const k = dateToKey_(r.date);
    let vp = null;
    if (r.validPeriods) {
      const s = String(r.validPeriods).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
      vp = s.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n));
    }
    calMap[k] = {
      isEntryExists: true,
      isSchoolday: parseBool(r.isSchoolday),
      isNoClassDay: parseBool(r.isNoClassDay),
      remark: r.remark || '',
      validPeriods: vp
    };
  });

  // 指定月の全日付を生成
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // ★祝日情報の取得
  const holidayMap = getHolidaysMap_(startDate, endDate);

  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const k = dateToKey_(d);
    const dow = d.getDay();
    const isHoliday = !!holidayMap[k]; // 祝日フラグ

    if (calMap[k]) {
      // DBに設定がある場合
      days.push({
        date: k,
        dow: dow,
        isSchoolday: calMap[k].isSchoolday,
        isNoClassDay: calMap[k].isNoClassDay,
        remark: calMap[k].remark,
        validPeriods: calMap[k].validPeriods,
        isHoliday: isHoliday // ★追加: フロントでの色分け用
      });
    } else {
      // DBに設定がない場合（デフォルト値）
      // 土日(0,6) または 祝日(isHoliday) は休み
      const isOff = (dow === 0 || dow === 6 || isHoliday);
      
      days.push({
        date: k,
        dow: dow,
        isSchoolday: !isOff, // 休みなら登校日false
        isNoClassDay: isOff, // 休みなら授業なしtrue
        remark: '',
        validPeriods: null,
        isHoliday: isHoliday
      });
    }
  }
  return days;
}

function saveCalendarBulk(records) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let sh = ss.getSheetByName('calendar');
  if (!sh) {
    sh = ss.insertSheet('calendar');
    sh.appendRow(['date', 'isSchoolday', 'isNoClassDay', 'remark', 'validPeriods']);
  }

  let header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  // 古いシートで isNoClassDay 列がない場合は列を追加
  if (header.indexOf('isNoClassDay') === -1) {
    var colIdx = header.indexOf('isSchoolday');
    var insertCol = (colIdx >= 0 ? colIdx + 2 : 3);
    sh.insertColumnAfter(insertCol - 1);
    sh.getRange(1, insertCol).setValue('isNoClassDay');
    header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  }
  const idx = {}; header.forEach(function(h, i) { idx[h] = i; });
  if (idx.date === undefined) {
    throw new Error('calendar シートに date 列がありません。ヘッダーを確認してください。');
  }
  const data = sh.getDataRange().getValues();
  const rowMap = {};
  for (var i = 1; i < data.length; i++) {
    const k = dateToKey_(data[i][idx.date]);
    if (k) rowMap[k] = i + 1;
  }

  const toAppend = [];
  records.forEach(function(rec) {
    const k = rec.date;
    const rowNum = rowMap[k];
    const rowData = header.map(function(h) {
      if (h === 'date') return rec.date;
      if (h === 'isSchoolday') return rec.isSchoolday === true || String(rec.isSchoolday).toLowerCase() === 'true';
      if (h === 'isNoClassDay') return rec.isNoClassDay === true || String(rec.isNoClassDay).toLowerCase() === 'true';
      if (h === 'remark') return rec.remark != null ? String(rec.remark) : '';
      if (h === 'validPeriods') return rec.validPeriods != null ? String(rec.validPeriods) : '';
      return '';
    });

    if (rowNum) {
      sh.getRange(rowNum, 1, 1, header.length).setValues([rowData]);
    } else {
      toAppend.push(rowData);
    }
  });

  if (toAppend.length > 0) {
    const startRow = sh.getLastRow() + 1;
    sh.getRange(startRow, 1, toAppend.length, header.length).setValues(toAppend);
  }
  return { success: true };
}