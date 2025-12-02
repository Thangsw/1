const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('tokens.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log('=== TOKENS IN EXCEL ===');
  console.log('Total lanes:', data.length);
  console.log('\nLane names:');
  data.forEach((token, i) => {
    console.log(`${i + 1}. "${token.name}" - sessionToken: ${token.sessionToken ? 'YES' : 'NO'}, cookies: ${token.cookies ? 'YES' : 'NO'}, proxy: ${token.proxy || 'NO'}, projectId: ${token.projectId || 'NO'}`);
  });
} catch (error) {
  console.error('Error:', error.message);
}
