// =========================
// データ取得 API (高速化版)
// =========================

function getAllSheetData_(ss, targetSheets) {
  const data = {};
  const sheetsToLoad = targetSheets || SHEET_NAMES;
  
  sheetsToLoad.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh) {
      const range = sh.getDataRange();
      const vals = range.getValues();
      if (vals.length > 0) {
        const header = vals[0];
        const rows = vals.slice(1);
        const objRows = rows.map(row => {
          const obj = {};
          header.forEach((h, i) => {
            obj[h] = row[i];
          });
          return obj;
        });
        data[name] = objRows;
      } else {
        data[name] = [];
      }
    } else {
      data[name] = [];
    }
  });
  return data;
}

function dateToKey_(d) {
  if (!d) return "";
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const tz = ss.getSpreadsheetTimeZone();
    return Utilities.formatDate(dt, tz, 'yyyy-MM-dd');
  } catch (e) {
    const y = dt.getFullYear();
    const m = ('0' + (dt.getMonth() + 1)).slice(-2);
    const day = ('0' + dt.getDate()).slice(-2);
    return `${y}-${m}-${day}`;
  }
}

function saveAttendanceCommon_(sheetName, payload, headerList) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('サーバーが混み合っています。再試行してください。');

  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sh = ss.getSheetByName(sheetName);
    if (!sh) throw new Error('Sheet not found: ' + sheetName);

    const lastRow = sh.getLastRow();
    const range = sh.getDataRange();
    const values = range.getValues();
    
    // ヘッダー確認・作成
    let headers = (values.length > 0 && values[0]) ? values[0] : null;
    if (lastRow === 0 || !headers || headers.length === 0) {
      headers = headerList;
      sh.appendRow(headers);
    }

    const records = Array.isArray(payload) ? payload : [payload];
    const toAppend = records.map(rec => {
      return headers.map(h => {
        let val = rec[h];
        if (val === undefined || val === null) return '';
        if (h === 'date') return dateToKey_(val);
        return val;
      });
    });

    // 同一キーの既存行を除外するためのキー集合（今回保存するレコード）
    const payloadKeys = new Set();
    records.forEach(rec => {
      const d = dateToKey_(rec.date);
      if (sheetName === 'attendance_hr') {
        payloadKeys.add(d + '__' + String(rec.grade) + '__' + String(rec.class) + '__' + String(rec.number));
      } else if (sheetName === 'attendance_subject') {
        payloadKeys.add(d + '__' + String(rec.subjectId) + '__' + String(rec.grade) + '__' + String(rec.class) + '__' + String(rec.period) + '__' + String(rec.number));
      }
    });

    const idx = {};
    headers.forEach((h, i) => { idx[h] = i; });

    function rowToKey_(row) {
      const d = dateToKey_(row[idx.date]);
      if (sheetName === 'attendance_hr') {
        return d + '__' + String(row[idx.grade] || '') + '__' + String(row[idx.class] || '') + '__' + String(row[idx.number] || '');
      }
      if (sheetName === 'attendance_subject') {
        return d + '__' + String(row[idx.subjectId] || '') + '__' + String(row[idx.grade] || '') + '__' + String(row[idx.class] || '') + '__' + String(row[idx.period] || '') + '__' + String(row[idx.number] || '');
      }
      return '';
    }

    const dataRows = values.length > 1 ? values.slice(1) : [];
    const filteredExisting = dataRows.filter(row => !payloadKeys.has(rowToKey_(row)));
    const allDataRows = filteredExisting.concat(toAppend);

    const newLastRow = 1 + allDataRows.length;
    sh.getRange(1, 1, newLastRow, headers.length).setValues([headers].concat(allDataRows));
    // 行数が減った場合に末尾の古い行をクリア
    if (lastRow > newLastRow) {
      sh.getRange(newLastRow + 1, 1, lastRow, sh.getLastColumn()).clearContent();
    }

    return { success: true };

  } catch (e) {
    throw e;
  } finally {
    lock.releaseLock();
  }
}

// ★修正: 祝日カレンダーIDを明示し、取得エラー時の対策を追加
function getHolidaysMap_(start, end) {
  const map = {};
  // 日本の祝日カレンダーID
  const calId = 'ja.japanese#holiday@group.v.calendar.google.com';
  
  try {
    const cal = CalendarApp.getCalendarById(calId);
    if (!cal) {
      console.warn(`Calendar ID not found: ${calId}`);
      return map;
    }
    const events = cal.getEvents(start, end);
    events.forEach(e => {
      // タイムゾーンをスクリプトに合わせてフォーマット
      const k = Utilities.formatDate(e.getStartTime(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      map[k] = true;
    });
  } catch (e) {
    console.warn('Holiday calendar fetch failed: ' + e.message);
  }
  return map;
}