// =========================
// マスタ管理用 API
// =========================

function getMasterData(sheetName) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return { headers: [], data: [] };

  const range = sh.getDataRange();
  const vals = range.getValues();
  if (vals.length < 1) return { headers: [], data: [] };

  const headers = vals[0];
  const data = vals.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
      }
      obj[h] = val;
    });
    return obj;
  });
  return { headers: headers, data: data };
}

function saveMasterData(sheetName, headers, records) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet not found');

  // ★追加: 科目IDと科目名の統一処理
  // records内の subjectName を subjectId で上書きする
  if (sheetName === 'subjects' || sheetName === 'teacher_config') {
      records.forEach(rec => {
          if (rec.subjectId !== undefined) {
              rec.subjectName = rec.subjectId;
          }
      });
  }

  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow, sh.getLastColumn()).clearContent();
  }

  if (records.length === 0) return { success: true };

  const rows = records.map(rec => {
    return headers.map(h => {
       const val = rec[h];
       return (val === undefined || val === null) ? '' : val;
    });
  });

  sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return { success: true };
}

function saveDayConfiguration(calendarRecord, timetableChanges, grade, className) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Busy');

  try {
    // 1. カレンダー
    const calSh = ss.getSheetByName('calendar');
    const calRows = calSh.getDataRange().getValues();
    const dateIdx = calRows[0].indexOf('date');
    const targetDate = calendarRecord.date;
    
    let foundRow = -1;
    for(let i=1; i<calRows.length; i++) {
        if(dateToKey_(calRows[i][dateIdx]) === targetDate) {
            foundRow = i + 1;
            break;
        }
    }
    
    const calHeaders = ['date', 'isSchoolday', 'isNoClassDay', 'remark', 'validPeriods'];
    const rowData = calHeaders.map(h => calendarRecord[h]);
    
    if(foundRow > 0) {
        calSh.getRange(foundRow, 1, foundRow, calHeaders.length).setValues([rowData]);
    } else {
        calSh.appendRow(rowData);
    }

    // 2. 時間割変更 (daily_timetable_changes)
    const ttSh = ss.getSheetByName('daily_timetable_changes');
    if(ttSh) {
        const ttData = ttSh.getDataRange().getValues();
        const ttHeader = ttData[0];
        const hIdx = {}; ttHeader.forEach((h,i)=>hIdx[h]=i);
        
        const newRows = [];
        for(let i=1; i<ttData.length; i++) {
            const r = ttData[i];
            const d = dateToKey_(r[hIdx.date]);
            const g = String(r[hIdx.grade]);
            const c = String(r[hIdx.class]);
            
            if (d === targetDate && g === String(grade) && c === String(className)) {
                continue; // 削除対象
            }
            newRows.push(r);
        }
        
        timetableChanges.forEach(tc => {
            const r = [];
            ttHeader.forEach(h => {
                r.push(tc[h] || '');
            });
            newRows.push(r);
        });
        
        if (ttSh.getLastRow() > 1) {
            ttSh.getRange(2, 1, ttSh.getLastRow(), ttSh.getLastColumn()).clearContent();
        }
        if (newRows.length > 0) {
            ttSh.getRange(2, 1, 1 + newRows.length, ttHeader.length).setValues(newRows);
        }
    }

    return { success: true };
  } catch(e) {
      throw e;
  } finally {
      lock.releaseLock();
  }
}