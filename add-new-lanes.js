const XLSX = require('xlsx');
const fs = require('fs');

try {
  // Read existing tokens
  const workbook = XLSX.readFile('tokens.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const existingTokens = XLSX.utils.sheet_to_json(sheet);

  console.log('📊 Current tokens:', existingTokens.length);

  // New lanes to add
  const newLanes = [
    {
      name: 'taikhoan3070@team9.edgaragencyy.io.vn',
      sessionToken: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..Y1K1Gt_JWA05rhZc.DUdMVRTBA2QjPEF1e_SO5mXUc6NILaewWTHBA4vhNVkphtj2CCDc_AgVtf10WfMtSPizMU-YXYCVMlPKY2T8eVbFTp4WtYzFKpMwQXBZCr5h6p_LBXFO3haK0xGPcynMWyI41BuSUoOlQpnK3gDW7SUlAObEURGQCqUxPmy2oTtbfBy-QYReP7xwufPKn-6PL2A7w8llrAD8RZRRuxMQTD4eTbzwj1N1ZjDdYcSV9lGQRYF9HCKpRKcObZ3lOM1nlB2hzHIFIA6FL03F8VeCR1ouNxItIiF1xDI5-Cmp6D0BFpgcLp7Ss7ZHX1UnPhM7tNv-L4h2jJ92FdRAuI98hTq-dpjPexPBOB1zvcSP0mcaUNt5xZWgbWYhiq5FqsVovZWufbIOLSu0XkGpnpfogYpiZ-nKAqs6kWUs_4Lqsu2Gqb5RAAqjFOiugHBJIF4mqOzJUYsi8dXG1mIfs0iO6WsiAiYP95yu6ek2AljxzuGdF4XgicuF3RqjwfrneffLxlEBtcy5aQA8kLrODEbcifB8xpVWXq1azF5S6Zuy2ZC-sexZYupV41BmxjeDaOu3R7NM00-jaSZ2ni-7jW2iLJjIO3ajU_OeF6Ff83zkyzZ8lsW1IIQ55bRliC8TQ5YtDTwLzWFwuKaq-mqROeN-SCfnz_t6fVyGEI-WFr2-RbCCsugXCP-aUUTyXclhph7_GBAWMgNQPsm3JPmZljC2mgmOGcZ2sNZ1EObEB6oEo6UqDi7lXrIwrBtC09H3l1-wX-Bsyz5_EWF9mwDvEUNvpSyu7EYxHhUzQFYQXH1ZUnpFTZk5mOcEYpQc1koAlPlEmF2YqfJsRfhi-bsDzpxvQzTLQ2-1Qv3hT23wr5gDD-noXxS3qu7eF2H4xKADhIcv9a-ZkRgWfbFSaXQtTVu6IEVTJ924rt5C2aLzY65Pvd8FAzjXX8AYKkLIskXfIQuYEJHAQ6ZgdWi8D2Sz9ye-DnriKLjnOdF_PFNDbJ837XvWA8JsT88.Fvcq-b8WB695IbqzJJlLpQ',
      cookies: '__Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..Y1K1Gt_JWA05rhZc.DUdMVRTBA2QjPEF1e_SO5mXUc6NILaewWTHBA4vhNVkphtj2CCDc_AgVtf10WfMtSPizMU-YXYCVMlPKY2T8eVbFTp4WtYzFKpMwQXBZCr5h6p_LBXFO3haK0xGPcynMWyI41BuSUoOlQpnK3gDW7SUlAObEURGQCqUxPmy2oTtbfBy-QYReP7xwufPKn-6PL2A7w8llrAD8RZRRuxMQTD4eTbzwj1N1ZjDdYcSV9lGQRYF9HCKpRKcObZ3lOM1nlB2hzHIFIA6FL03F8VeCR1ouNxItIiF1xDI5-Cmp6D0BFpgcLp7Ss7ZHX1UnPhM7tNv-L4h2jJ92FdRAuI98hTq-dpjPexPBOB1zvcSP0mcaUNt5xZWgbWYhiq5FqsVovZWufbIOLSu0XkGpnpfogYpiZ-nKAqs6kWUs_4Lqsu2Gqb5RAAqjFOiugHBJIF4mqOzJUYsi8dXG1mIfs0iO6WsiAiYP95yu6ek2AljxzuGdF4XgicuF3RqjwfrneffLxlEBtcy5aQA8kLrODEbcifB8xpVWXq1azF5S6Zuy2ZC-sexZYupV41BmxjeDaOu3R7NM00-jaSZ2ni-7jW2iLJjIO3ajU_OeF6Ff83zkyzZ8lsW1IIQ55bRliC8TQ5YtDTwLzWFwuKaq-mqROeN-SCfnz_t6fVyGEI-WFr2-RbCCsugXCP-aUUTyXclhph7_GBAWMgNQPsm3JPmZljC2mgmOGcZ2sNZ1EObEB6oEo6UqDi7lXrIwrBtC09H3l1-wX-Bsyz5_EWF9mwDvEUNvpSyu7EYxHhUzQFYQXH1ZUnpFTZk5mOcEYpQc1koAlPlEmF2YqfJsRfhi-bsDzpxvQzTLQ2-1Qv3hT23wr5gDD-noXxS3qu7eF2H4xKADhIcv9a-ZkRgWfbFSaXQtTVu6IEVTJ924rt5C2aLzY65Pvd8FAzjXX8AYKkLIskXfIQuYEJHAQ6ZgdWi8D2Sz9ye-DnriKLjnOdF_PFNDbJ837XvWA8JsT88.Fvcq-b8WB695IbqzJJlLpQ; _ga_X2GNH8R5NS=GS2.1.s1764677676$o1$g1$t1764678041$j60$l0$h32625743; email=taikhoan3070%40team9.edgaragencyy.io.vn; __Secure-next-auth.callback-url=https%3A%2F%2Flabs.google%2Ffx%2Ftools%2Fwhisk%2Fproject; EMAIL=%22taikhoan3070%40team9.edgaragencyy.io.vn%22; _ga=GA1.1.1687152183.1764677677; __Host-next-auth.csrf-token=d7e952bf43fc71f35ae9a2d41d4bb9ef132669b968ae89138cf0538463d1dbb9%7C4446b1765ca43f08dcf16fc1ab61e229d93ccee5506cc9d3fe7d17d82d27828d',
      proxy: '',
      projectId: '',
      sceneId: '',
      savedAt: new Date().toISOString()
    },
    {
      name: 'Deriap3',
      sessionToken: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..oNgjOfYoWJXFNyhN.G-cJeM3QuUp9951MfCte4Cz1SSNq2pidu7H7bDrANGUp4crQWIJrWDVyKTfbXs_o-4z6NhfDFwpxzjIj-WtsRwJAzfJHC0iV4RvDaQsBmRrmUipX-zOFq18FqcOYL5PtndGGJ_Hm8fIeqmfX-zky1IHmy72IPZmoxzdA2RF8FNxwiQrOjNRPetcIBR14FPkKREntLbNww1uxqEiU1xIPvWE55zhVKVnUauSGHhXg7RMkxtgm_5ojvg8ktLZisnX85K1fti3En53SF0UI27bTqSleywMzU_656Um3o59GiHf6Ghre9BbSZAaPa_Ii5GJwoQpQEYhdEiuwyh_4vEhdwHsKFXfBROXU-CIQpiO1gdRKbnYCH4pOMwMRYxrDWMPp-107S-nw84uK4wHlkvRwypoMVxoPDGJ7V8Z7C-vXv7yQOLOXe5GOI1hyl5ApHpmMC0b7P266tEqJb8AgD_WEqlkeRrOK6LP1hf1VUKdMRBzfg3jArDVtefA43OaD3UxgMyIq3AQotNS1Bp3NBAUyfEN8FogHSLKfggSZ8IamdMn9SdGL4bW0XNw5d8AezD-7HWweOyTH4Oy4_Zh728fDnKCb0m5PQM6JjqFgYCCwhcHOYO31AMTnsWMtD8_rP3sDsoFGVgeSc4EL7k0aSyyphovrj3ROHrjXoiwlQAIcqv8GKF8NUfLETDPL97zg8AktNP-9iilcrokuCHgEzPbFv3dmxqAbM1hiDN74vTF0d2OYGgKApCMJLSP8qMbhNI8RYUxhymNWJEPVmEqtX4EBqOvBcY1XCSb2r5ERXwPQuTcl0qeFerDz6HGmSGB3oefboooe1My-b9VjyiXLY2Be1kaWLBsVZVWyFarsl0NceEzHn6qV2Q6j-oa48oXUGhZaICCy7MPNBR5kypg3J7Ha-p9dKM1PqJ5lfZUNhqDuHZNn2_TuIGziP6sLz_pzCv3o9VHqygg1X4k01s9ghyEMKsaWPoR_8qnXQR7ezkU-Kk_Y2htne7Y.3FXj3LTE1abShD4Z0SDpiA',
      cookies: '__Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..oNgjOfYoWJXFNyhN.G-cJeM3QuUp9951MfCte4Cz1SSNq2pidu7H7bDrANGUp4crQWIJrWDVyKTfbXs_o-4z6NhfDFwpxzjIj-WtsRwJAzfJHC0iV4RvDaQsBmRrmUipX-zOFq18FqcOYL5PtndGGJ_Hm8fIeqmfX-zky1IHmy72IPZmoxzdA2RF8FNxwiQrOjNRPetcIBR14FPkKREntLbNww1uxqEiU1xIPvWE55zhVKVnUauSGHhXg7RMkxtgm_5ojvg8ktLZisnX85K1fti3En53SF0UI27bTqSleywMzU_656Um3o59GiHf6Ghre9BbSZAaPa_Ii5GJwoQpQEYhdEiuwyh_4vEhdwHsKFXfBROXU-CIQpiO1gdRKbnYCH4pOMwMRYxrDWMPp-107S-nw84uK4wHlkvRwypoMVxoPDGJ7V8Z7C-vXv7yQOLOXe5GOI1hyl5ApHpmMC0b7P266tEqJb8AgD_WEqlkeRrOK6LP1hf1VUKdMRBzfg3jArDVtefA43OaD3UxgMyIq3AQotNS1Bp3NBAUyfEN8FogHSLKfggSZ8IamdMn9SdGL4bW0XNw5d8AezD-7HWweOyTH4Oy4_Zh728fDnKCb0m5PQM6JjqFgYCCwhcHOYO31AMTnsWMtD8_rP3sDsoFGVgeSc4EL7k0aSyyphovrj3ROHrjXoiwlQAIcqv8GKF8NUfLETDPL97zg8AktNP-9iilcrokuCHgEzPbFv3dmxqAbM1hiDN74vTF0d2OYGgKApCMJLSP8qMbhNI8RYUxhymNWJEPVmEqtX4EBqOvBcY1XCSb2r5ERXwPQuTcl0qeFerDz6HGmSGB3oefboooe1My-b9VjyiXLY2Be1kaWLBsVZVWyFarsl0NceEzHn6qV2Q6j-oa48oXUGhZaICCy7MPNBR5kypg3J7Ha-p9dKM1PqJ5lfZUNhqDuHZNn2_TuIGziP6sLz_pzCv3o9VHqygg1X4k01s9ghyEMKsaWPoR_8qnXQR7ezkU-Kk_Y2htne7Y.3FXj3LTE1abShD4Z0SDpiA; _ga_X2GNH8R5NS=GS2.1.s1764677676$o1$g1$t1764678349$j60$l0$h32625743; _ga_5K7X2T4V16=GS2.1.s1764678162$o1$g0$t1764678163$j59$l0$h0; _ga=GA1.1.1687152183.1764677677; EMAIL=%22taikhoan3070%40team9.edgaragencyy.io.vn%22; __Host-next-auth.csrf-token=0855c402f6b6db8030dff100c1e9c72f29d1e5b330eb51ac12bbd8ba4b1c13e6%7C0a8fd10b444234ad8691ef8ebf57262b0d68865bfa0dab468794c2ab9fa85d04; __Secure-next-auth.callback-url=https%3A%2F%2Flabs.google',
      proxy: '',
      projectId: '',
      sceneId: '',
      savedAt: new Date().toISOString()
    }
  ];

  // Add new lanes
  const allTokens = [...existingTokens, ...newLanes];

  // Create new worksheet
  const newWorksheet = XLSX.utils.json_to_sheet(allTokens);

  // Set column widths
  newWorksheet['!cols'] = [
    { wch: 40 },  // name (wider for email addresses)
    { wch: 80 },  // sessionToken
    { wch: 100 }, // cookies
    { wch: 30 },  // proxy
    { wch: 40 },  // projectId
    { wch: 40 }   // sceneId
  ];

  // Create new workbook
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Tokens');

  // Write to file
  XLSX.writeFile(newWorkbook, 'tokens.xlsx');

  // Also update tokens.txt for backup
  fs.writeFileSync('tokens.txt', JSON.stringify(allTokens, null, 2), 'utf-8');

  console.log(`✅ Added ${newLanes.length} new lanes to tokens.xlsx`);
  console.log(`📊 Total lanes now: ${allTokens.length}`);
  console.log('\nNew lanes:');
  newLanes.forEach(lane => console.log(`  - ${lane.name}`));

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
