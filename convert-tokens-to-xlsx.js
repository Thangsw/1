// Convert tokens.txt (JSON) to tokens.xlsx for easy editing
const XLSX = require('xlsx');
const fs = require('fs');

try {
  // Read tokens.txt
  const tokensJSON = JSON.parse(fs.readFileSync('tokens.txt', 'utf-8'));

  // Convert to Excel format
  const rows = tokensJSON.map(token => ({
    name: token.name || '',
    sessionToken: token.sessionToken || '',
    cookies: token.cookies || '',
    proxy: token.proxy || '',
    projectId: token.projectId || '',
    sceneId: token.sceneId || ''
  }));

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tokens');

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 20 },  // name
    { wch: 80 },  // sessionToken
    { wch: 100 }, // cookies
    { wch: 30 },  // proxy
    { wch: 40 },  // projectId
    { wch: 40 }   // sceneId
  ];

  // Write to file
  XLSX.writeFile(workbook, 'tokens.xlsx');

  console.log(`✅ Created tokens.xlsx with ${rows.length} tokens`);
  console.log('📋 Columns: name, sessionToken, cookies, proxy, projectId, sceneId');
  console.log('💡 You can now edit tokens.xlsx directly in Excel!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
