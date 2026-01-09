// =========================
// データ取得 API (高速化版)
// =========================

function getAllSheetData_(ss, targetSheets) {
  const data = {};
  // targetSheetsが指定されていない場合は全シート対象
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
  // LockServiceによる排他制御
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) { // 最大10秒待機
    try {
      const ss = SpreadsheetApp.openById(SS_ID);
      let sh = ss.getSheetByName(sheetName);
      if (!sh) throw new Error(`Sheet "${sheetName}" not found.`);

      const lastRow = sh.getLastRow();
      let header = [];
      if (lastRow === 0) {
        sh.appendRow(headerList);
        header = headerList;
      } else {
        header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        const missingCols = [];
        headerList.forEach(hName => {
          if (!header.includes(hName)) missingCols.push(hName);
        });
        if (missingCols.length > 0) {
          const startCol = header.length + 1;
          sh.getRange(1, startCol, 1, missingCols.length).setValues([missingCols]);
          header = header.concat(missingCols);
        }
      }

      const range = sh.getDataRange();
      const values = range.getValues();
      const idx = {};
      header.forEach((h, i) => (idx[h] = i));

      const createKey = (row) => {
        const d = dateToKey_(row[idx.date]);
        const g = String(row[idx.grade]);
        const c = String(row[idx.class]);
        const n = String(row[idx.number] !== undefined && row[idx.number] !== "" ? row[idx.number] : (row[idx.studentId] || ''));
        if (sheetName === 'attendance_subject') {
          const s = String(row[idx.subjectId]);
          const p = String(row[idx.period]);
          return `${d}_${s}_${g}_${c}_${p}_${n}`;
        } else {
          return `${d}_${g}_${c}_${n}`;
        }
      };

      const keyToRowMap = {};
      for (let i = 1; i < values.length; i++) {
        const key = createKey(values[i]);
        keyToRowMap[key] = i + 1;
      }

      const toUpdate = [];
      const toAppend = [];

      const grade = String(payload.grade);
      const className = String(payload.className);
      const subjectId = String(payload.subjectId || '');
      (payload.records || []).forEach(rec => {
        const n = String(rec.number);
        let key;
        if (sheetName === 'attendance_subject') {
          key = `${rec.date}_${subjectId}_${grade}_${className}_${rec.period}_${n}`;
        } else {
          key = `${rec.date}_${grade}_${className}_${n}`;
        }

        const rowData = new Array(header.length).fill('');
        header.forEach((col, i) => {
          if (col === 'date') rowData[i] = rec.date;
          else if (col === 'grade') rowData[i] = grade;
          else if (col === 'class') rowData[i] = className;
          else if (col === 'number') rowData[i] = n;
          else if (col === 'studentId') rowData[i] = n;
          else if (col === 'status') rowData[i] = rec.status;
          else if (col === 'subjectId') rowData[i] = subjectId;
          else if (col === 'period') rowData[i] = rec.period;
          else if (col === 'periods') rowData[i] = rec.periods;
          else if (col === 'memo') rowData[i] = rec.memo;
        });

        if (keyToRowMap[key]) {
          toUpdate.push({ row: keyToRowMap[key], values: rowData });
        } else {
          toAppend.push(rowData);
        }
      });
      toUpdate.forEach(item => {
        sh.getRange(item.row, 1, 1, header.length).setValues([item.values]);
      });
      if (toAppend.length) {
        sh.getRange(lastRow + 1, 1, toAppend.length, header.length).setValues(toAppend);
      }
      return { success: true };
    } catch (e) {
      throw e;
    } finally {
      lock.releaseLock();
    }
  } else {
    throw new Error('他人が保存中です。しばらく待ってからやり直してください。');
  }
}

function createSheetIfNotExists_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  const range = sh.getRange(1, 1, 1, header.length);
  if (range.isBlank()) { range.setValues([header]); }
}