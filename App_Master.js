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
      // 日付オブジェクトの場合は文字列に変換（シリアライズエラー回避）
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

  // ヘッダー以外をクリア
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).clearContent();
  }

  if (records.length === 0) return { success: true };
  // 保存
  const rows = records.map(rec => {
    return headers.map(h => rec[h] || '');
  });
  sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return { success: true };
}