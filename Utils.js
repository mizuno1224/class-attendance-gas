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
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  const y = dt.getFullYear();
  const m = ('0' + (dt.getMonth() + 1)).slice(-2);
  const day = ('0' + dt.getDate()).slice(-2);
  return `${y}-${m}-${day}`;
}

function saveAttendanceCommon_(sheetName, payload, headerList) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('サーバーが混み合っています。再試行してください。');

  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    const sh = ss.getSheetByName(sheetName);
    if (!sh) throw new Error('Sheet not found: ' + sheetName);

    const lastRow = sh.getLastRow();
    const range = sh.getDataRange();
    const values = range.getValues();
    
    // ヘッダー確認・作成
    let headers = values[0];
    if (lastRow === 0 || !headers) {
        headers = headerList;
        sh.appendRow(headers);
    }

    const records = Array.isArray(payload) ? payload : [payload];
    const toAppend = [];

    records.forEach(rec => {
        const rowData = headers.map(h => {
            let val = rec[h];
            if (val === undefined || val === null) return '';
            if (h === 'date') return dateToKey_(val);
            return val;
        });
        toAppend.push(rowData);
    });
    
    if (toAppend.length > 0) {
        sh.getRange(lastRow + 1, 1, toAppend.length, headers.length).setValues(toAppend);
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