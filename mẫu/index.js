const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const axios = require('axios');
const fsSync = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// TELEGRAM CONFIG
const TELEGRAM_BOT_TOKEN = '6653182047:AAHN5PfD5UXEtqusRvDbJmgdnhFhNS8DB-8';
const TELEGRAM_CHAT_ID = '-1002158646611';

// HÀM GỬI TELEGRAM
async function sendTelegram(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    console.log('📱 Đã gửi thông báo Telegram');
  } catch (e) {
    console.error('❌ Lỗi gửi Telegram:', e.message);
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function runAutoLogger() {
  console.log('🤖 MÁY GHI ÂM API - AUTO LOOP...');
  
  const startTime = new Date();

  const botId = await askQuestion('ID bot: ');
  if (!botId) return console.error('Cần ID bot.');

  let PROJECT_URL = await askQuestion('Link project: ');
  if (!PROJECT_URL.startsWith('http')) PROJECT_URL = 'https://' + PROJECT_URL;

  let projectId;
  try {
    const match = PROJECT_URL.match(/\/project\/([a-f0-9-]{36})/);
    if (match) projectId = match[1];
    else throw new Error('Không tìm projectId.');
    console.log(`✓ Project ID: ${projectId}`);
  } catch (e) {
    console.error(e.message);
    return;
  }

  if (!projectId) return console.error('Project ID null. Thoát.');

  // ĐỌC FILE PROMPTS
  let dataPath = await askQuestion('Đường dẫn file prompts (Enter = data.txt): ');
  if (!dataPath || dataPath.trim() === '') {
    dataPath = path.join(__dirname, 'data.txt');
  } else {
    dataPath = dataPath.trim();
    if ((dataPath.startsWith('"') && dataPath.endsWith('"')) || 
        (dataPath.startsWith("'") && dataPath.endsWith("'"))) {
      dataPath = dataPath.slice(1, -1);
    }
    if (!path.isAbsolute(dataPath)) {
      dataPath = path.join(__dirname, dataPath);
    }
  }
  
  let prompts = [];
  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    
    let rawPrompts = [];
    let detectedFormat = '';
    
    console.log('\n🔍 DEBUG: Kiểm tra format file...');
    console.log(`   Độ dài file: ${data.length} ký tự`);
    console.log(`   50 ký tự đầu: "${data.substring(0, 50)}..."`);
    
    // Thử format "Prompt X (new/continue):"
    const promptRegex = /Prompt\s*\d+\s*\([^)]+\)\s*:/gi;
    const matches = data.match(promptRegex);
    
    console.log(`   Tìm thấy pattern "Prompt X (...)": ${matches ? matches.length : 0} lần`);
    if (matches) {
      console.log(`   Các matches: ${matches.join(', ')}`);
    }
    
    if (matches && matches.length > 0) {
      // QUAN TRỌNG: Phải dùng flag 'g' để split đúng
      const parts = data.split(/Prompt\s*\d+\s*\([^)]+\)\s*:/gi);
      rawPrompts = parts.slice(1).map(p => p.trim()).filter(p => p.length > 0);
      detectedFormat = 'format "Prompt X (type):"';
      
      console.log(`   Sau khi split: ${parts.length} phần`);
      console.log(`   Sau khi filter: ${rawPrompts.length} prompts`);
    }
    // Thử format "#X." 
    else {
      const hashNumberRegex = /#\d+\./g;
      if (hashNumberRegex.test(data)) {
        const parts = data.split(/#\d+\./);
        rawPrompts = parts.slice(1).map(p => p.trim()).filter(p => p.length > 0);
        detectedFormat = 'format "#X."';
      }
      // Thử format "prompt X:"
      else {
        const promptRegex2 = /prompt\s*\d+\s*:/gi;
        if (promptRegex2.test(data)) {
          const parts = data.split(/prompt\s*\d+\s*:/i);
          rawPrompts = parts.slice(1).map(p => p.trim()).filter(p => p.length > 0);
          detectedFormat = 'format "prompt X:"';
        } else {
          // Format: ----------
          rawPrompts = data.split('----------').map(p => p.trim()).filter(p => p.length > 0);
          detectedFormat = 'format "----------"';
        }
      }
    }
    
    prompts = rawPrompts;
    console.log(`✓ Phát hiện ${detectedFormat}`);
    console.log(`✓ Đọc ${prompts.length} prompts từ ${path.basename(dataPath)}`);
    
    // Hiển thị preview 3 prompts đầu
    console.log('\n📋 Preview prompts:');
    prompts.slice(0, 3).forEach((p, idx) => {
      const preview = p.length > 80 ? p.substring(0, 80) + '...' : p;
      console.log(`   ${idx + 1}. ${preview}`);
    });
    if (prompts.length > 3) {
      console.log(`   ... và ${prompts.length - 3} prompts nữa`);
    }
    console.log('');
  } catch (e) {
    console.error(`❌ Không đọc được file: ${e.message}`);
    return;
  }

  if (prompts.length === 0) {
    console.error('❌ File rỗng hoặc không có prompts!');
    return;
  }

  // TẠO THƯ MỤC LƯU VIDEO
  const promptFileName = path.basename(dataPath, path.extname(dataPath));
  const parentDir = path.dirname(dataPath);
  const outputDir = path.join(parentDir, promptFileName);
  const tuyChonBDir = path.join(outputDir, 'Tuy chon B');

  try {
    if (!fsSync.existsSync(outputDir)) {
      await fs.mkdir(outputDir, { recursive: true });
      console.log(`✓ Tạo thư mục: ${outputDir}`);
    } else {
      console.log(`✓ Sử dụng thư mục: ${outputDir}`);
    }

    if (!fsSync.existsSync(tuyChonBDir)) {
      await fs.mkdir(tuyChonBDir, { recursive: true });
      console.log(`✓ Tạo thư mục: ${path.join(promptFileName, 'Tuy chon B')}`);
    }
  } catch (e) {
    console.error(`❌ Không tạo được thư mục: ${e.message}`);
    return;
  }

  const PROFILE_PATH = path.join(__dirname, `chrome-profile-${botId}`);
  console.log(`✓ Profile: ${PROFILE_PATH}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: PROFILE_PATH,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  let bearerToken = null;
  let sceneId = null;
  let lastClipId = null;
  let initialClips = [];
  let cookies = '';

  await page.setRequestInterception(true);

  page.on('request', request => {
    const headers = request.headers();
    if (request.url().includes('credits')) bearerToken = headers.authorization;
    if (request.url().includes('/api/trpc/') && headers.cookie) cookies = headers.cookie;
    request.continue();
  });

  page.on('response', async response => {
    if (response.url().includes('searchProjectScenes')) {
      try {
        const json = await response.json();
        const result = json.result?.data?.json?.result;
        if (result?.scenes?.length > 0) {
          sceneId = result.scenes[0].sceneId;
          const clips = result.scenes[0].clips || [];
          initialClips = [...clips];
          lastClipId = clips[clips.length - 1]?.clipId;
          console.log(`✓ Scene ID: ${sceneId}`);
          console.log(`✓ Last Clip ID: ${lastClipId}`);
          console.log(`✓ Current clips: ${clips.length}`);
        }
      } catch (e) {
        console.error('Lỗi parse searchProjectScenes:', e.message);
      }
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TRÌNH DUYỆT MỞ. ĐĂNG NHẬP NẾU CẦU.');
  console.log('═══════════════════════════════════════════════════════════');
  await askQuestion('➡️ Sẵn sàng, nhấn Enter: ');
  
  try {
    await page.goto(PROJECT_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.error('Lỗi tải trang:', e.message);
    await browser.close();
    return;
  }

  console.log('\n⏳ Chờ token & clips...');
  const maxWait = 30000;
  const checkStartTime = Date.now();
  while ((!bearerToken || !sceneId) && (Date.now() - checkStartTime < maxWait)) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!bearerToken || !sceneId) {
    console.error('⏰ Timeout. Refresh chạy lại.');
    await browser.close();
    return;
  }
  console.log('✅ Sẵn sàng!');
  console.log('🔑 Token: ' + bearerToken.substring(0, 50) + '...');

  // THÔNG BÁO BẮT ĐẦU
  await sendTelegram(
    `🚀 <b>BẮT ĐẦU RENDER</b>\n\n` +
    `📁 File: <code>${path.basename(dataPath)}</code>\n` +
    `📊 Tổng prompts: <b>${prompts.length}</b>\n` +
    `🕐 Thời gian: ${startTime.toLocaleString('vi-VN')}\n` +
    `🆔 Bot ID: <code>${botId}</code>`
  );

  // ═══════════════════════════════════════════════════════════
  // LOOP QUA TẤT CẢ PROMPTS
  // ═══════════════════════════════════════════════════════════
  let successCount = 0;
  let errorPrompts = [];
  
  for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
    const prompt = prompts[promptIndex];
    const remaining = prompts.length - promptIndex - 1;
    const promptNumber = promptIndex + 2;
    
    // PHÁT HIỆN LOẠI PROMPT: NEW HAY CONTINUE
    const isNewPrompt = prompt.toLowerCase().includes('(new)');
    const isContinuePrompt = prompt.toLowerCase().includes('(continue)');
    
    let promptType = 'continue'; // Mặc định là continue
    if (isNewPrompt) {
      promptType = 'new';
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`[${promptIndex + 1}/${prompts.length}] 📝 Prompt [${promptType.toUpperCase()}]: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    console.log(`   Còn lại: ${remaining} prompts`);
    
    if (promptType === 'continue') {
      console.log(`✓ Sử dụng Clip ID: ${lastClipId.substring(0, 50)}...`);
    } else {
      console.log(`✓ Tạo scene mới (không dùng clipID)`);
    }
    
    console.log(`✓ Scene ID: ${sceneId}`);
    console.log(`✓ Current clips: ${initialClips.length}`);

    // BƯỚC 1: TẠO 2 VARIANTS
    const seeds = [
      Math.floor(Math.random() * 65536), 
      Math.floor(Math.random() * 65536)
    ];
    
    // XÂY DỰNG REQUEST KHÁC NHAU TÙY THEO LOẠI
    let requests, generateUrl;
    
    if (promptType === 'new') {
      // ✅ NEW: GENERATE VIDEO MỚI (KHÔNG CÓ videoInput)
      requests = seeds.map(seed => ({
        textInput: { prompt },
        videoModelKey: 'veo_3_1_landscape_ultra',
        aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE',
        seed,
        metadata: { sceneId }
      }));
      
      generateUrl = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideo';
      
    } else {
      // ✅ CONTINUE: EXTEND VIDEO (CÓ videoInput)
      requests = seeds.map(seed => ({
        textInput: { prompt },
        videoInput: { 
          mediaId: lastClipId, 
          startFrameIndex: 168, 
          endFrameIndex: 191 
        },
        videoModelKey: 'veo_3_1_extend_fast_landscape_ultra',
        aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE',
        seed,
        metadata: { sceneId }
      }));
      
      generateUrl = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoExtendVideo';
    }

    const bodyObj = {
      clientContext: { 
        projectId, 
        tool: 'PINHOLE', 
        userPaygateTier: 'PAYGATE_TIER_TWO' 
      },
      requests
    };

    console.log(`🚀 Gửi ${promptType} request (2 variants)...`);

    let resultOps = [];
    try {
      const response = await axios.post(generateUrl, JSON.stringify(bodyObj), {
        headers: {
          'accept': '*/*',
          'accept-language': 'en-US,en;q=0.9',
          'authorization': bearerToken,
          'content-type': 'text/plain;charset=UTF-8',
          'priority': 'u=1, i',
          'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'cross-site',
          'x-browser-channel': 'stable',
          'x-browser-copyright': 'Copyright 2025 Google LLC. All rights reserved.',
          'x-browser-validation': 'AGaxImjg97xQkd0h3geRTArJi8Y=',
          'x-browser-year': '2025',
          'x-client-data': 'CIyIywE=',
          'Referer': 'https://labs.google/'
        }
      });

      console.log('✅ Generate request sent! Status:', response.status);

      if (response.data && response.data.operations && Array.isArray(response.data.operations)) {
        resultOps = response.data.operations.map(op => ({
          operation: { name: op.operation.name },
          sceneId: op.sceneId,
          status: op.status
        }));
        console.log(`✓ Đã tạo ${resultOps.length} operations`);
      } else {
        console.error('❌ Response không có operations!');
        continue;
      }

    } catch (e) {
      console.error('❌ Lỗi generate:', e.response?.status, e.response?.data || e.message);
      errorPrompts.push({
        number: promptNumber,
        prompt: prompt.substring(0, 100),
        error: 'Lỗi generate request'
      });
      await sendTelegram(
        `❌ <b>LỖI GENERATE</b>\n\n` +
        `📝 Prompt #${promptNumber}: <code>${prompt.substring(0, 80)}...</code>\n` +
        `⚠️ Lỗi: Generate request failed`
      );
      continue;
    }

    // BƯỚC 2: POLL VIDEO STATUS
    console.log('⏳ Chờ video hoàn thành (poll mỗi 10s, max 120 lần)...');
    const checkStatusUrl = 'https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus';
    
    let pollDone = false;
    let pollAttempts = 0;
    const maxPoll = 120;
    let selectedMediaId = null;
    let videoUrls = [];
    const totalVariants = resultOps.length;
    
    while (pollAttempts < maxPoll && !pollDone) {
      pollAttempts++;
      
      try {
        const checkBody = JSON.stringify({ operations: resultOps });
        
        const pollRes = await axios.post(checkStatusUrl, checkBody, {
          headers: { 
            'accept': '*/*',
            'authorization': bearerToken, 
            'content-type': 'text/plain;charset=UTF-8',
            'Referer': 'https://labs.google/',
            'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'x-browser-channel': 'stable',
            'x-browser-copyright': 'Copyright 2025 Google LLC. All rights reserved.',
            'x-browser-validation': 'AGaxImjg97xQkd0h3geRTArJi8Y=',
            'x-browser-year': '2025',
            'x-client-data': 'CIyIywE='
          }
        });
        
        const statusData = pollRes.data;
        
        if (statusData.operations && Array.isArray(statusData.operations)) {
          let successCountPoll = 0;
          let activeCount = 0;
          let pendingCount = 0;
          let failedCount = 0;
          
          statusData.operations.forEach((op, idx) => {
            if (op.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
              successCountPoll++;
              if (op.mediaGenerationId) {
                if (!selectedMediaId) {
                  selectedMediaId = op.mediaGenerationId;
                  console.log(`   ✅ Chọn variant ${idx + 1}: ${selectedMediaId}`);
                }
                
                const fifeUrl = op.operation?.metadata?.video?.fifeUrl;
                if (fifeUrl && !videoUrls.includes(fifeUrl)) {
                  videoUrls.push(fifeUrl);
                  console.log(`   📹 URL video ${idx + 1}: ${fifeUrl.substring(0, 80)}...`);
                }
              }
            } else if (op.status === 'MEDIA_GENERATION_STATUS_ACTIVE') {
              activeCount++;
            } else if (op.status === 'MEDIA_GENERATION_STATUS_PENDING') {
              pendingCount++;
            } else if (op.status === 'MEDIA_GENERATION_STATUS_FAILED') {
              failedCount++;
            }
          });
          
          console.log(`   Poll #${pollAttempts}: ✅ ${successCountPoll}/${totalVariants} | ⚙️ ${activeCount} | ⏳ ${pendingCount}${failedCount > 0 ? ` | ❌ ${failedCount}` : ''}`);
          
          const completedCount = successCountPoll + failedCount;
          if (completedCount >= totalVariants) {
            pollDone = true;
            if (successCountPoll > 0) {
              console.log(`🎉 Tất cả ${totalVariants} video đã sẵn sàng! (${successCountPoll} thành công)`);
            } else {
              console.log('❌ Tất cả video đều thất bại!');
            }
          }
          
          resultOps = statusData.operations.map(op => ({
            operation: { name: op.operation.name },
            sceneId: op.sceneId,
            status: op.status
          }));
        }
        
      } catch (e) {
        console.error(`   ❌ Lỗi poll #${pollAttempts}: ${e.response?.status || e.message}`);
      }
      
      if (!pollDone && pollAttempts < maxPoll) {
        await new Promise(r => setTimeout(r, 10000));
      }
    }
    
    if (!pollDone || !selectedMediaId) {
      console.log('⏰ Timeout hoặc không có mediaId - Skip prompt này.');
      errorPrompts.push({
        number: promptNumber,
        prompt: prompt.substring(0, 100),
        error: 'Timeout poll video'
      });
      await sendTelegram(
        `⏰ <b>LỖI TIMEOUT</b>\n\n` +
        `📝 Prompt #${promptNumber}: <code>${prompt.substring(0, 80)}...</code>\n` +
        `⚠️ Lỗi: Video không hoàn thành sau ${maxPoll * 10}s`
      );
      continue;
    }

    // BƯỚC 2.5: TẢI VIDEO VỀ MÁY
    if (videoUrls.length > 0) {
      console.log(`\n📥 Tải ${videoUrls.length} video về máy...`);
      
      let downloadSuccess = true;
      
      for (let i = 0; i < videoUrls.length && i < 2; i++) {
        const videoUrl = videoUrls[i];
        const variantLetter = String.fromCharCode(97 + i);
        const fileName = `${promptNumber}${variantLetter}.mp4`;
        
        const filePath = i === 0
          ? path.join(outputDir, fileName)
          : path.join(tuyChonBDir, fileName);

        try {
          console.log(`   Đang tải: ${fileName} ${i === 0 ? '' : '(vào Tuy chon B/)'}...`);

          const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream'
          });

          await streamPipeline(response.data, fsSync.createWriteStream(filePath));
          console.log(`   ✅ Đã lưu: ${i === 0 ? '' : 'Tuy chon B/'}${fileName}`);
          
        } catch (e) {
          console.error(`   ❌ Lỗi tải ${fileName}: ${e.message}`);
          downloadSuccess = false;
          errorPrompts.push({
            number: promptNumber,
            prompt: prompt.substring(0, 100),
            error: `Lỗi tải ${fileName}`
          });
          await sendTelegram(
            `❌ <b>LỖI TẢI VIDEO</b>\n\n` +
            `📝 Prompt #${promptNumber}: <code>${prompt.substring(0, 80)}...</code>\n` +
            `📹 File: <code>${fileName}</code>\n` +
            `⚠️ Lỗi: ${e.message}`
          );
        }
      }
      
      if (downloadSuccess) {
        successCount++;
      }
    }

    // BƯỚC 3: UPDATE SCENE VỚI CLIP MỚI
    console.log('🚀 Gọi updateScene để add clip mới...');
    
    const lastClip = initialClips[initialClips.length - 1];
    const lastEndTime = lastClip ? parseFloat(lastClip.endTime.replace('s', '')) : 0;
    const newStartTime = (lastEndTime + 0.000000001).toFixed(9) + 's';
    const newEndTime = (lastEndTime + 7.000000001).toFixed(9) + 's';

    const newClip = {
      clipId: selectedMediaId,
      startTime: newStartTime,
      endTime: newEndTime,
      prompt
    };
    
    const updatedClips = [...initialClips, newClip];

    const updateBody = {
      json: {
        projectId,
        scene: { sceneId, clips: updatedClips },
        toolName: 'PINHOLE',
        updateMasks: ['clips']
      }
    };

    const updateUrl = 'https://labs.google/fx/api/trpc/project.updateScene';
    try {
      const updateRes = await axios.post(updateUrl, JSON.stringify(updateBody), {
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'cookie': cookies,
          'Referer': PROJECT_URL,
          'priority': 'u=1, i',
          'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin'
        }
      });
      console.log('✅ UpdateScene Success: Status', updateRes.status);
      console.log(`🎉 Đã add clip! Media ID: ${selectedMediaId}`);
      
      // CẬP NHẬT CHO LẦN LOOP SAU
      initialClips = updatedClips;
      lastClipId = selectedMediaId;
      
    } catch (e) {
      console.error('❌ Lỗi updateScene:', e.response?.status, e.message);
      errorPrompts.push({
        number: promptNumber,
        prompt: prompt.substring(0, 100),
        error: 'Lỗi updateScene'
      });
      await sendTelegram(
        `❌ <b>LỖI UPDATE SCENE</b>\n\n` +
        `📝 Prompt #${promptNumber}: <code>${prompt.substring(0, 80)}...</code>\n` +
        `⚠️ Lỗi: Không thể add clip vào project`
      );
      continue;
    }

    // NGHỈ 2 GIÂY TRƯỚC KHI LOOP TIẾP
    await new Promise(r => setTimeout(r, 2000));
  }

  // ═══════════════════════════════════════════════════════════
  // KẾT THÚC
  // ═══════════════════════════════════════════════════════════
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / 1000 / 60);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 HOÀN THÀNH TẤT CẢ PROMPTS!');
  console.log(`✅ Thành công: ${successCount}/${prompts.length}`);
  console.log(`❌ Lỗi: ${errorPrompts.length}`);
  console.log(`⏱️ Thời gian: ${duration} phút`);
  console.log('Refresh browser để xem tất cả clips.');
  console.log('Nhấn CTRL+C để đóng browser.');
  console.log('═══════════════════════════════════════════════════════════\n');

  // THÔNG BÁO HOÀN THÀNH
  let telegramMsg = `✅ <b>HOÀN THÀNH RENDER</b>\n\n` +
    `📁 File: <code>${path.basename(dataPath)}</code>\n` +
    `📊 Kết quả: <b>${successCount}/${prompts.length}</b> thành công\n` +
    `⏱️ Thời gian: <b>${duration} phút</b>\n` +
    `🕐 Kết thúc: ${endTime.toLocaleString('vi-VN')}\n` +
    `🆔 Bot ID: <code>${botId}</code>`;
  
  if (errorPrompts.length > 0) {
    telegramMsg += `\n\n❌ <b>${errorPrompts.length} lỗi:</b>`;
    errorPrompts.forEach(err => {
      telegramMsg += `\n• Prompt #${err.number}: ${err.error}`;
    });
  }
  
  await sendTelegram(telegramMsg);

  await new Promise(r => process.on('SIGINT', r));
  await browser.close();
}

runAutoLogger().catch(err => {
  console.error('❌ Lỗi nghiêm trọng:', err);
  process.exit(1);
});