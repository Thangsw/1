// video-veo3.js
// Flow helpers for Veo3: 2-image gen, 1-image gen, text-to-video, extend, and scene update.
// Added: Local file upload -> crop -> base64 -> /upload-cropped-image to get mediaId.
//
// Backend endpoints expected:
// - POST /api/veo3/submit-batch-log
// - POST /api/veo3/generate-start-end
// - POST /api/veo3/generate-text
// - POST /api/veo3/check-status
// - POST /api/veo3/extend-video
// - POST /api/veo3/update-scene
// - POST /api/veo3/upload-cropped-image     body: { imageBase64 } -> { success:true, mediaId }
//
// NOTE: No UI code here. You can pass File objects to helper functions below.

const VideoVeo3 = (() => {
  const api = {
    async submitBatchLog(bodyJson) {
      return postJson("/api/veo3/submit-batch-log", bodyJson);
    },
    async generateStartEnd(payload) {
      return postJson("/api/veo3/generate-start-end", payload);
    },
    async generateStartImage(payload) {
      return postJson("/api/veo3/generate-start-image", payload);
    },
    async generateText(payload) {
      return postJson("/api/veo3/generate-text", payload);
    },
    async checkStatus(payloadOrQuery) {
      return postJson("/api/veo3/check-status", payloadOrQuery);
    },
    async extendVideo(payload) {
      return postJson("/api/veo3/extend-video", payload);
    },
    async updateScene(payload) {
      return postJson("/api/veo3/update-scene", payload);
    },
    async uploadRawImage(payload) {
      return postJson("/api/veo3/upload-raw-image", payload);
    },
    async uploadCroppedImage(payload) {
      return postJson("/api/veo3/upload-cropped-image", payload);
    }
  };

  async function postJson(url, body, retryCount = 0, maxRetries = 5) {
    console.log(`📡 [API] POST ${url} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    // Truncate body to prevent stack overflow when logging large base64 images
    const bodyStr = JSON.stringify(body ?? {});
    if (bodyStr.length > 200) {
      console.log(`📤 [API] Request body: ${bodyStr.substring(0, 200)}... (${bodyStr.length} chars total)`);
    } else {
      console.log(`📤 [API] Request body:`, body);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyStr
    });

    console.log(`📥 [API] Response status: ${res.status} ${res.statusText}`);

    // Handle 429 Too Many Requests with exponential backoff
    if (res.status === 429) {
      if (retryCount < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 32000); // Max 32 seconds
        console.warn(`⚠️ [API] 429 Rate Limited - Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);

        // Try to read retry-after header if available
        const retryAfter = res.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : backoffMs;

        console.log(`⏸️ [API] Waiting ${waitMs}ms before retry...`);
        await sleep(waitMs);

        return postJson(url, body, retryCount + 1, maxRetries);
      } else {
        const text = await res.text().catch(() => "");
        console.error(`❌ [API] ${url} FAILED after ${maxRetries} retries: 429 Rate Limit Exceeded`);
        throw new Error(`API rate limit exceeded after ${maxRetries} retries: ${text}`);
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`❌ [API] ${url} failed: ${res.status} ${text}`);
      throw new Error(`API ${url} failed: ${res.status} ${text}`);
    }

    const json = await res.json();

    // Truncate response data if too large
    const jsonStr = JSON.stringify(json);
    if (jsonStr.length > 500) {
      console.log(`✅ [API] Response data: ${jsonStr.substring(0, 500)}... (${jsonStr.length} chars total)`);
    } else {
      console.log(`✅ [API] Response data:`, json);
    }

    return json;
  }

  // ---------- Image upload helpers (no UI) ----------

  // Cache để lưu mediaId đã upload (key: filename_size_aspectRatio)
  const mediaIdCache = new Map();

  /**
   * Convert a local File to a mediaId by uploading raw + cropped (2 uploads).
   * @param {File} file
   * @param {"VIDEO_ASPECT_RATIO_LANDSCAPE"|"VIDEO_ASPECT_RATIO_PORTRAIT"|"VIDEO_ASPECT_RATIO_SQUARE"} aspectRatio
   * @param {{format?: "image/jpeg"|"image/png", quality?: number}} [opts]
   * @returns {Promise<{ mediaId: string, width: number, height: number, dataUrl: string, fileName: string }>}
   */
  async function fileToMediaId(file, aspectRatio = "VIDEO_ASPECT_RATIO_LANDSCAPE", opts = {}) {
    // Check cache first
    const cacheKey = `${file.name}_${file.size}_${aspectRatio}`;
    if (mediaIdCache.has(cacheKey)) {
      const cachedData = mediaIdCache.get(cacheKey);
      console.log(`✅ [fileToMediaId] ♻️ REUSE CACHED mediaId for: ${file.name}`);
      console.log(`   📌 Cached mediaId: ${cachedData.mediaId.substring(0, 40)}...`);
      return cachedData;
    }

    const sessionId = `;${Date.now()}`;

    // First: upload raw image bytes
    const rawBytes = await file.arrayBuffer();

    // Convert to base64 without spread operator (avoid stack overflow with large files)
    const uint8Array = new Uint8Array(rawBytes);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const rawBase64 = btoa(binaryString);

    // Event 1: PINHOLE_UPLOAD_IMAGE
    try {
      await api.submitBatchLog(buildUploadLog("PINHOLE_UPLOAD_IMAGE", { sessionId }));
    } catch {}

    await api.uploadRawImage({ rawImageBytes: rawBase64, aspectRatio });

    // Second: upload cropped image
    const { dataUrl, width, height } = await fileToCroppedDataUrl(file, aspectRatio, opts);

    // Event 2: PINHOLE_UPLOAD_IMAGE_TO_CROP (với width/height)
    try {
      await api.submitBatchLog(buildUploadLog("PINHOLE_UPLOAD_IMAGE_TO_CROP", {
        width,
        height,
        sessionId
      }));
    } catch {}

    const resp = await api.uploadCroppedImage({ imageBase64: dataUrl, aspectRatio, sessionId });
    if (!resp?.mediaId) throw new Error("upload-cropped-image: missing mediaId");

    // Event 3: PINHOLE_RESIZE_IMAGE (sau khi upload thành công)
    try {
      await api.submitBatchLog(buildUploadLog("PINHOLE_RESIZE_IMAGE", {
        aspectRatio,
        sessionId
      }));
    } catch {}

    const result = { mediaId: resp.mediaId, width, height, dataUrl, fileName: file.name };

    // Cache the result
    mediaIdCache.set(cacheKey, result);
    console.log(`✅ [fileToMediaId] 🆕 NEW UPLOAD - mediaId: ${resp.mediaId.substring(0, 40)}...`);
    console.log(`   💾 Cached for future use: ${file.name}`);

    return result;
  }

  /**
   * Process multiple files at once.
   * @param {File[]} files
   * @param {"VIDEO_ASPECT_RATIO_LANDSCAPE"|"VIDEO_ASPECT_RATIO_PORTRAIT"|"VIDEO_ASPECT_RATIO_SQUARE"} aspectRatio
   */
  async function filesToMediaIds(files, aspectRatio = "VIDEO_ASPECT_RATIO_LANDSCAPE", opts = {}) {
    const out = [];
    for (const f of files) {
      if (!/^image\//i.test(f.type)) continue;
      const one = await fileToMediaId(f, aspectRatio, opts);
      out.push(one);
    }
    return out;
  }

  /**
   * Read file -> Image -> draw to canvas with cover-crop -> dataURL.
   */
  async function fileToCroppedDataUrl(file, aspectRatio, opts = {}) {
    console.log(`🖼️ [fileToCroppedDataUrl] START - file: ${file.name}, size: ${file.size} bytes`);

    const format = opts.format || "image/jpeg";
    const quality = opts.quality ?? 0.92;

    try {
      const img = await loadImageFromFile(file);
      console.log(`✅ [fileToCroppedDataUrl] Image loaded: ${img.width}x${img.height}`);

      const { targetW, targetH } = targetSizeFromAspect(aspectRatio);
      console.log(`🎯 [fileToCroppedDataUrl] Target size: ${targetW}x${targetH}`);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;
      const scale = Math.max(targetW / srcW, targetH / srcH); // cover
      const drawW = Math.ceil(srcW * scale);
      const drawH = Math.ceil(srcH * scale);
      const dx = Math.floor((targetW - drawW) / 2);
      const dy = Math.floor((targetH - drawH) / 2);

      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      console.log(`🎨 [fileToCroppedDataUrl] Drawing to canvas...`);
      const dataUrl = canvas.toDataURL(format, quality);
      console.log(`✅ [fileToCroppedDataUrl] DataURL created: ${dataUrl.length} chars`);

      return { dataUrl, width: targetW, height: targetH };
    } catch (error) {
      console.error(`❌ [fileToCroppedDataUrl] Error:`, error);
      throw error;
    }
  }

  function targetSizeFromAspect(aspectRatio) {
    switch (aspectRatio) {
      case "VIDEO_ASPECT_RATIO_PORTRAIT": return { targetW: 507, targetH: 929 };
      case "VIDEO_ASPECT_RATIO_SQUARE":   return { targetW: 720, targetH: 720 };
      case "VIDEO_ASPECT_RATIO_LANDSCAPE":
      default:                             return { targetW: 929, targetH: 507 };
    }
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  }

  // ---------- High-level flows ----------

  async function startEndFlow(args) {
    const {
      prompt,
      startImageMediaId,
      endImageMediaId,
      aspectRatio = "VIDEO_ASPECT_RATIO_LANDSCAPE",
      durationSec = 8,
      seed = 0,
      projectId,
      sceneId
    } = args;

    try {
      await api.submitBatchLog(buildTextOrImageLog("VIDEOFX_CREATE_VIDEO", "TEXT_TO_VIDEO"));
      await api.submitBatchLog(buildTextOrImageLog("PINHOLE_GENERATE_VIDEO", "TEXT_TO_VIDEO"));
      await api.submitBatchLog(buildVideoTimerLog());
    } catch {}

    const payload = { prompt, aspectRatio, durationSec, seed };
    if (startImageMediaId) payload.startImageMediaId = startImageMediaId;
    if (endImageMediaId)   payload.endImageMediaId   = endImageMediaId;
    if (projectId) payload.projectId = projectId;
    if (sceneId)   payload.sceneId   = sceneId;

    return api.generateStartEnd(payload);
  }

  async function textToVideoFlow(args) {
    const {
      projectId,
      prompt,
      aspectRatio = "VIDEO_ASPECT_RATIO_LANDSCAPE",
      videoModelKey = "veo_3_1_t2v_fast_ultra",
      seeds = [26907, 23736],
      sceneIds,
      tokenName  // CRITICAL: Lane name for multi-account + proxy
    } = args;

    const laneTag = tokenName ? `[Lane: ${tokenName}]` : '';
    console.log(`📺 ${laneTag} [textToVideoFlow] START`, { projectId, prompt, aspectRatio, seeds, sceneIds });

    try {
      console.log(`📤 ${laneTag} [textToVideoFlow] Submitting batch logs...`);
      await api.submitBatchLog(buildTextOrImageLog("VIDEOFX_CREATE_VIDEO", "TEXT_TO_VIDEO"));
      await api.submitBatchLog(buildTextOrImageLog("PINHOLE_GENERATE_VIDEO", "TEXT_TO_VIDEO"));
      await api.submitBatchLog(buildVideoTimerLog());
    } catch (e) {
      console.warn(`⚠️ ${laneTag} [textToVideoFlow] Batch log submission failed (non-critical):`, e);
    }

    const requests = seeds.map((seed, i) => ({
      aspectRatio,
      seed,
      textInput: { prompt },
      videoModelKey,
      ...(sceneIds?.[i] ? { metadata: { sceneId: sceneIds[i] } } : {})
    }));

    console.log(`🔄 ${laneTag} [textToVideoFlow] Calling api.generateText with ${requests.length} requests...`);

    const result = await api.generateText({
      clientContext: {
        projectId,
        tool: "PINHOLE",
        userPaygateTier: "PAYGATE_TIER_TWO"
      },
      requests,
      tokenName  // CRITICAL: Pass tokenName to API
    });

    console.log(`✅ ${laneTag} [textToVideoFlow] Result:`, result);
    return result;
  }

  async function extendFlow(args) {
    const { previousMediaGenerationId, prompt, additionalDurationSec = 8 } = args;
    try { await api.submitBatchLog(buildTextOrImageLog("PINHOLE_GENERATE_VIDEO", "TEXT_TO_VIDEO")); } catch {}
    return api.extendVideo({ previousMediaGenerationId, prompt, additionalDurationSec });
  }

  async function pollOperation(opId, options = {}) {
    const { intervalMs = 2500, maxTries = 120, tokenName } = options;  // CRITICAL: Add tokenName
    const laneTag = tokenName ? `[Lane: ${tokenName}]` : '';
    console.log(`🔄 ${laneTag} [pollOperation] START - opId: ${opId}, maxTries: ${maxTries}, interval: ${intervalMs}ms`);

    for (let i = 0; i < maxTries; i++) {
      console.log(`⏳ ${laneTag} [pollOperation] Poll attempt ${i + 1}/${maxTries} for ${opId.substring(0, 50)}...`);

      // Send operations array to match server.js format
      const res = await api.checkStatus({
        operations: [{ operation: { name: opId } }],
        tokenName  // CRITICAL: Pass tokenName to use same lane
      });

      // Check if token expired (401 error)
      if (!res.success && res.tokenExpired) {
        console.error(`❌ ${laneTag} [pollOperation] Token expired!`);
        alert('⚠️ TOKEN ĐÃ HẾT HẠN!\n\nVui lòng:\n1. Click nút "Bắt Token" ở tab Settings\n2. Sau đó thử lại');
        throw new Error("Token expired - please refresh");
      }

      const op = res?.operations?.[0];

      console.log(`📡 ${laneTag} [pollOperation] Response attempt ${i + 1}:`, {
        hasOp: !!op,
        status: op?.status,
        hasVideo: !!op?.video
      });

      if (!op) {
        console.error(`❌ ${laneTag} [pollOperation] Invalid status payload - no operation in response`);
        throw new Error("Invalid status payload");
      }

      // Check for SUCCESSFUL status
      if (op.status === "SUCCESSFUL" || op.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
        console.log(`✅ ${laneTag} [pollOperation] SUCCESS! Completed after ${i + 1} attempts`);
        return op;
      }

      // Check for FAILED status
      if (op.status === "FAILED" || op.status === "MEDIA_GENERATION_STATUS_FAILED") {
        const errorMsg = op.operation?.error?.message || '';

        // Check if it's a HIGH_TRAFFIC error (can retry)
        if (errorMsg.includes('HIGH_TRAFFIC')) {
          console.warn(`⚠️ ${laneTag} [pollOperation] HIGH_TRAFFIC error - will retry polling (attempt ${i + 1}/${maxTries})`);
          // Don't throw yet, continue polling - it might succeed on next attempt
          console.log(`⏸️ ${laneTag} [pollOperation] Waiting ${intervalMs * 2}ms before retry...`);
          await sleep(intervalMs * 2); // Double wait time for HIGH_TRAFFIC
          continue;
        }

        // For other errors, throw immediately
        console.error(`❌ ${laneTag} [pollOperation] FAILED:`, op.error || op);
        throw new Error(`Generation failed: ${errorMsg || JSON.stringify(op)}`);
      }

      console.log(`⏸️ ${laneTag} [pollOperation] Status: ${op.status} - waiting ${intervalMs}ms before next poll...`);
      await sleep(intervalMs);
    }

    console.error(`❌ ${laneTag} [pollOperation] TIMEOUT after ${maxTries} attempts`);
    throw new Error("Timeout polling status");
  }

  async function updateSceneClips(args) {
    const { projectId, sceneId, clips } = args;
    const payload = {
      json: {
        projectId,
        scene: { sceneId, clips },
        toolName: "PINHOLE",
        updateMasks: ["clips"]
      }
    };
    return api.updateScene(payload);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function buildTextOrImageLog(event, mode) {
    return {
      json: {
        appEvents: [{
          event,
          eventMetadata: { sessionId: `;${Date.now()}` },
          eventProperties: [
            { key: "TOOL_NAME", stringValue: "PINHOLE" },
            { key: "QUERY_ID", stringValue: `PINHOLE_MAIN_VIDEO_GENERATION_CACHE_ID${cryptoRandomId()}` },
            { key: "PINHOLE_VIDEO_ASPECT_RATIO", stringValue: "VIDEO_ASPECT_RATIO_LANDSCAPE" },
            { key: "G1_PAYGATE_TIER", stringValue: "PAYGATE_TIER_TWO" },
            { key: "PINHOLE_PROMPT_BOX_MODE", stringValue: mode },
            { key: "USER_AGENT", stringValue: navigator.userAgent },
            { key: "IS_DESKTOP" }
          ],
          activeExperiments: [],
          eventTime: new Date().toISOString()
        }]
      }
    };
  }

  function buildVideoTimerLog() {
    return {
      json: {
        appEvents: [{
          event: "VIDEO_CREATION_TO_VIDEO_COMPLETION",
          eventProperties: [
            { key: "TIMER_ID", stringValue: `VIDEO_CREATION_TO_VIDEO_COMPLETION${cryptoRandomId()}` },
            { key: "TOOL_NAME", stringValue: "PINHOLE" },
            { key: "CURRENT_TIME_MS", intValue: String(Date.now()) },
            { key: "USER_AGENT", stringValue: navigator.userAgent },
            { key: "IS_DESKTOP" }
          ],
          activeExperiments: [],
          eventMetadata: { sessionId: `;${Date.now()}` },
          eventTime: new Date().toISOString()
        }]
      }
    };
  }

  function buildUploadLog(event, params = {}) {
    const { width, height, aspectRatio, sessionId } = params;

    const eventProperties = [
      { key: "TOOL_NAME", stringValue: "PINHOLE" }
    ];

    // Thêm width/height cho event PINHOLE_UPLOAD_IMAGE_TO_CROP
    if (event === "PINHOLE_UPLOAD_IMAGE_TO_CROP" && width && height) {
      eventProperties.push(
        { key: "PINHOLE_UPLOAD_IMAGE_TO_CROP_WIDTH", doubleValue: width },
        { key: "PINHOLE_UPLOAD_IMAGE_TO_CROP_HEIGHT", doubleValue: height }
      );
    }

    // Thêm aspect ratio cho event PINHOLE_RESIZE_IMAGE
    if (event === "PINHOLE_RESIZE_IMAGE" && aspectRatio) {
      // Convert VIDEO_ASPECT_RATIO_* to IMAGE_ASPECT_RATIO_*
      let imageAspectRatio = aspectRatio;
      if (aspectRatio.startsWith('VIDEO_')) {
        imageAspectRatio = aspectRatio.replace('VIDEO_', 'IMAGE_');
      }
      eventProperties.push(
        { key: "PINHOLE_IMAGE_ASPECT_RATIO", stringValue: imageAspectRatio }
      );
    }

    // Thêm các fields chung cho tất cả events
    eventProperties.push(
      { key: "G1_PAYGATE_TIER", stringValue: "PAYGATE_TIER_TWO" },
      { key: "PINHOLE_PROMPT_BOX_MODE", stringValue: "IMAGE_TO_VIDEO" },
      { key: "USER_AGENT", stringValue: navigator.userAgent },
      { key: "IS_DESKTOP" }
    );

    return {
      json: {
        appEvents: [{
          event,
          eventMetadata: { sessionId: sessionId || `;${Date.now()}` },
          eventProperties,
          activeExperiments: [],
          eventTime: new Date().toISOString()
        }]
      }
    };
  }

  function cryptoRandomId() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  return {
    // low-level api
    api,
    // local file helpers
    fileToMediaId,
    filesToMediaIds,
    fileToCroppedDataUrl,
    // flows
    startEndFlow,
    textToVideoFlow,
    extendFlow,
    pollOperation,
    updateSceneClips
  };
})();

export { VideoVeo3 };