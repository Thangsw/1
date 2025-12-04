# Hướng dẫn sử dụng Veo3FlowApi.js

## 📋 Tổng quan

Module `veo3FlowApi.js` cung cấp interface hoàn chỉnh để tích hợp Google Labs Flow API, bao gồm:
- ✅ Generate images từ text prompt
- ✅ Đánh dấu images làm "ingredients" cho continue mode
- ✅ Generate video từ 2 images với fallback tự động
- ✅ Workflow hoàn chỉnh: image → video trong 1 lần gọi

---

## 🚀 Cách sử dụng cơ bản

### 1. Import module

```javascript
// Trong HTML file (index3.html, index4.html)
<script src="veo3FlowApi.js"></script>

<script>
  // Module sẽ export class Veo3FlowApi
  const { Veo3FlowApi } = window;
</script>
```

### 2. Khởi tạo API instance

```javascript
// Đọc config từ lane được chọn
const laneConfig = {
  projectId: '1234567890',
  sceneId: 'abcd-efgh-ijkl',
  authorization: 'Bearer ya29.a0AfB_...',
  cookies: '__Secure-1PSID=...; __Secure-3PSID=...',
  proxy: 'http://proxy.example.com:8080', // optional
  serverUrl: 'http://localhost:3002' // server endpoint
};

const api = new Veo3FlowApi(laneConfig);
```

---

## 📚 Các phương thức chính

### Method 1: `generateImages(prompt, options)`

**Mục đích**: Generate ảnh từ text prompt

**Parameters**:
- `prompt` (string): Text prompt mô tả ảnh
- `options` (object):
  - `aspectRatio`: 'IMAGE_16_9' | 'IMAGE_9_16' | 'IMAGE_4_3' | 'IMAGE_1_1'
  - `numImages`: Số lượng ảnh (1-4)
  - `guidanceScale`: 'LOW' | 'MEDIUM' | 'HIGH'
  - `imageInputs`: Array of {mediaId, role} cho continue mode

**Returns**: Promise với object chứa `mediaIds` array

**Ví dụ**:
```javascript
const result = await api.generateImages(
  'A serene mountain landscape at sunset',
  {
    aspectRatio: 'IMAGE_16_9',
    numImages: 4,
    guidanceScale: 'MEDIUM'
  }
);

console.log(result);
// {
//   success: true,
//   sessionId: ';1733123456789',
//   mediaIds: ['uuid-1', 'uuid-2', 'uuid-3', 'uuid-4'],
//   projectId: '...',
//   sceneId: '...',
//   data: { ... }
// }
```

---

### Method 2: `updateFlowMedia(mediaId, options)`

**Mục đích**: Đánh dấu ảnh làm "ingredient" để dùng cho continue mode

**Parameters**:
- `mediaId` (string): ID của media cần update
- `options` (object):
  - `isIngredient` (boolean): true = đánh dấu làm ingredient

**Returns**: Promise với kết quả update

**Ví dụ**:
```javascript
// Đánh dấu 2 ảnh đầu làm ingredients
await api.updateFlowMedia(result.mediaIds[0], { isIngredient: true });
await api.updateFlowMedia(result.mediaIds[1], { isIngredient: true });

// Hoặc chạy parallel
await Promise.all([
  api.updateFlowMedia(result.mediaIds[0], { isIngredient: true }),
  api.updateFlowMedia(result.mediaIds[1], { isIngredient: true })
]);
```

---

### Method 3: `generateVideo(mediaIds, prompt, options)`

**Mục đích**: Generate video từ 2 images (start + end)

**Parameters**:
- `mediaIds` (array): Đúng 2 mediaIds [startImage, endImage]
- `prompt` (string): Text prompt mô tả video motion
- `options` (object):
  - `aspectRatio`: 'VIDEO_16_9' | 'VIDEO_9_16'
  - `durationSeconds`: 5 hoặc 8
  - `modelKeys`: Array model keys cho fallback (optional)

**Returns**: Promise với video generation result

**Ví dụ**:
```javascript
const videoResult = await api.generateVideo(
  [result.mediaIds[0], result.mediaIds[1]],
  'Camera slowly pans from left to right',
  {
    aspectRatio: 'VIDEO_16_9',
    durationSeconds: 5
  }
);

console.log(videoResult);
// {
//   success: true,
//   sessionId: ';1733123456999',
//   videoModelKey: 'veo_3_1_i2v_s_fast_fl_ultra_relaxed', // model đã dùng
//   projectId: '...',
//   sceneId: '...',
//   mediaIds: ['uuid-1', 'uuid-2'],
//   data: { ... }
// }
```

**Automatic Fallback**: Nếu model đầu tiên fail, tự động thử model thứ 2:
1. `veo_3_1_i2v_s_fast_fl_ultra_relaxed` (ultra relaxed)
2. `veo_3_1_i2v_s_fast_ultra_fl` (fallback)

---

### Method 4: `uploadImage(imageBase64, options)`

**Mục đích**: Upload ảnh lên Veo3 để lấy valid mediaId

**Parameters**:
- `imageBase64` (string): Base64 encoded image
- `options` (object):
  - `aspectRatio`: 'VIDEO_16_9' | 'VIDEO_9_16'

**Returns**: Promise với mediaId

**Ví dụ**:
```javascript
// Convert image to base64
const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

const uploadResult = await api.uploadImage(imageBase64, {
  aspectRatio: 'VIDEO_16_9'
});

console.log(uploadResult.mediaId); // 'uuid-xxx-xxx'
```

---

## 🎯 Workflow hoàn chỉnh (All-in-one)

### Method 5: `generateImageAndVideo(imagePrompt, videoPrompt, options)`

**Mục đích**: Workflow hoàn chỉnh trong 1 lần gọi:
1. Generate images từ prompt
2. Đánh dấu 2 ảnh đầu làm ingredients
3. Generate video từ 2 ảnh đó

**Ví dụ đầy đủ**:
```javascript
const result = await api.generateImageAndVideo(
  'A beautiful mountain landscape with snow-capped peaks',  // image prompt
  'Camera panning slowly from left to right, revealing the valley', // video prompt
  {
    imageAspectRatio: 'IMAGE_16_9',
    videoAspectRatio: 'VIDEO_16_9',
    numImages: 4,
    durationSeconds: 5
  }
);

if (result.success) {
  console.log('✅ Hoàn thành!');
  console.log('Images:', result.images.mediaIds); // ['uuid-1', 'uuid-2', 'uuid-3', 'uuid-4']
  console.log('Video sessionId:', result.video.sessionId);
  console.log('Model used:', result.video.modelUsed);
} else {
  console.error('❌ Lỗi:', result.error);
}
```

---

### Method 6: `continueWithImages(imageInputs, imagePrompt, videoPrompt, options)`

**Mục đích**: Continue mode - generate images mới từ ảnh cũ, rồi tạo video

**Ví dụ**:
```javascript
// Giả sử đã có 2 mediaIds từ lần generate trước
const existingMediaIds = ['uuid-old-1', 'uuid-old-2'];

// Prepare imageInputs
const imageInputs = [
  { mediaId: existingMediaIds[0], role: 'SUBJECT' },
  { mediaId: existingMediaIds[1], role: 'STYLE' }
];

const result = await api.continueWithImages(
  imageInputs,
  'Same landscape but now at golden hour with dramatic clouds', // new prompt
  'Camera zoom in slowly to the mountain peak',
  {
    imageAspectRatio: 'IMAGE_16_9',
    videoAspectRatio: 'VIDEO_16_9',
    numImages: 4,
    durationSeconds: 5
  }
);

console.log('New images:', result.images.mediaIds);
console.log('Input images used:', result.images.inputImages);
```

---

## 💡 Tích hợp vào Index3.html

### Bước 1: Import module

Thêm vào phần `<head>` hoặc cuối `<body>`:
```html
<script src="veo3FlowApi.js"></script>
```

### Bước 2: Khởi tạo khi chọn lane

```javascript
async function initializeFlowApi() {
  // Đọc thông tin lane hiện tại
  const selectedLane = document.getElementById('selectedLane').value;
  const laneData = await readLaneFromExcel(selectedLane);

  // Khởi tạo API instance
  window.flowApi = new Veo3FlowApi({
    projectId: laneData.projectId,
    sceneId: laneData.sceneId,
    authorization: laneData.authorization,
    cookies: laneData.cookies,
    proxy: laneData.proxy,
    serverUrl: window.location.origin // http://localhost:3002
  });

  console.log('✅ Flow API initialized');
}

// Gọi khi user chọn lane
document.getElementById('selectedLane').addEventListener('change', initializeFlowApi);
```

### Bước 3: Sử dụng trong generation flow

```javascript
async function generateVideoFromPrompts() {
  const imagePrompt = document.getElementById('imagePrompt').value;
  const videoPrompt = document.getElementById('videoPrompt').value;

  try {
    updateStatus('Đang generate images và video...');

    const result = await window.flowApi.generateImageAndVideo(
      imagePrompt,
      videoPrompt,
      {
        imageAspectRatio: 'IMAGE_16_9',
        videoAspectRatio: 'VIDEO_16_9',
        numImages: 4,
        durationSeconds: 5
      }
    );

    if (result.success) {
      updateStatus('✅ Hoàn thành!');

      // Hiển thị images
      displayImages(result.images.mediaIds);

      // Lưu video info để download sau
      saveVideoInfo(result.video);
    } else {
      updateStatus(`❌ Lỗi: ${result.error}`);
    }
  } catch (error) {
    updateStatus(`❌ Exception: ${error.message}`);
  }
}
```

---

## 🔧 Xử lý lỗi & Retry

Module tự động handle fallback cho video generation:

```javascript
// Tự động thử 2 models
const videoResult = await api.generateVideo(mediaIds, prompt);

// videoResult.videoModelKey sẽ cho biết model nào đã thành công:
// - 'veo_3_1_i2v_s_fast_fl_ultra_relaxed' (model đầu tiên)
// - 'veo_3_1_i2v_s_fast_ultra_fl' (fallback)
```

Nếu muốn custom fallback logic:

```javascript
const customModels = [
  'veo_3_1_i2v_s_fast_fl_ultra_relaxed',
  'veo_3_1_i2v_s_fast_ultra_fl',
  'veo_3_1_other_model' // thêm model khác
];

const videoResult = await api.generateVideo(
  mediaIds,
  prompt,
  { modelKeys: customModels }
);
```

---

## 📊 Flow diagram

```
┌─────────────────────────────────────────────────────────┐
│  generateImageAndVideo() - Complete Workflow            │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  1. generateImages()          │
         │  - POST batchGenerateImages   │
         │  - Return 4 mediaIds          │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  2. updateFlowMedia() x2      │
         │  - Mark img[0] as ingredient  │
         │  - Mark img[1] as ingredient  │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  3. generateVideo()           │
         │  - Try model 1 (ultra relaxed)│
         │  - If fail → model 2 (ultra)  │
         │  - Return video session       │
         └───────────────┬───────────────┘
                         │
                         ▼
                  ✅ Complete!
```

---

## 🎨 Ví dụ thực tế với UI

```javascript
// HTML
<button id="btnGenerate">🎬 Generate Image + Video</button>
<div id="status"></div>
<div id="imageGallery"></div>

// JavaScript
document.getElementById('btnGenerate').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  const galleryDiv = document.getElementById('imageGallery');

  // Initialize API với lane hiện tại
  const api = new Veo3FlowApi({
    projectId: state.projectId,
    sceneId: state.sceneId,
    authorization: state.authorization,
    cookies: state.cookies,
    serverUrl: 'http://localhost:3002'
  });

  // Step by step với progress updates
  try {
    // Step 1: Generate images
    statusDiv.innerHTML = '📸 Đang generate images...';
    const imageResult = await api.generateImages(
      'A futuristic city skyline at night',
      { aspectRatio: 'IMAGE_16_9', numImages: 4 }
    );

    if (!imageResult.success) {
      throw new Error(imageResult.error);
    }

    // Display images
    statusDiv.innerHTML = '✅ Generated 4 images';
    imageResult.mediaIds.forEach(mediaId => {
      const img = document.createElement('img');
      img.src = `https://labs.google/fx/media/${mediaId}`;
      galleryDiv.appendChild(img);
    });

    // Step 2: Mark as ingredients
    statusDiv.innerHTML = '🏷️ Đang đánh dấu ingredients...';
    await Promise.all([
      api.updateFlowMedia(imageResult.mediaIds[0], { isIngredient: true }),
      api.updateFlowMedia(imageResult.mediaIds[1], { isIngredient: true })
    ]);

    // Step 3: Generate video
    statusDiv.innerHTML = '🎬 Đang generate video...';
    const videoResult = await api.generateVideo(
      [imageResult.mediaIds[0], imageResult.mediaIds[1]],
      'Camera flying through the city streets',
      { aspectRatio: 'VIDEO_16_9', durationSeconds: 5 }
    );

    if (!videoResult.success) {
      throw new Error(videoResult.error);
    }

    statusDiv.innerHTML = `✅ Video generation started! Model: ${videoResult.videoModelKey}`;

    // Poll for video completion...
    pollVideoStatus(videoResult.sessionId);

  } catch (error) {
    statusDiv.innerHTML = `❌ Lỗi: ${error.message}`;
    console.error(error);
  }
});
```

---

## 📝 API Reference nhanh

| Method | Mục đích | Input | Output |
|--------|----------|-------|--------|
| `generateImages()` | Gen ảnh từ prompt | prompt, options | mediaIds array |
| `updateFlowMedia()` | Đánh dấu ingredient | mediaId, isIngredient | success status |
| `generateVideo()` | Gen video từ 2 ảnh | mediaIds[2], prompt | video session |
| `uploadImage()` | Upload ảnh → mediaId | base64, aspectRatio | mediaId |
| `generateImageAndVideo()` | All-in-one workflow | prompts, options | images + video |
| `continueWithImages()` | Continue mode | imageInputs, prompts | images + video |

---

## ⚡ Performance Tips

1. **Parallel execution**: Đánh dấu ingredients song song
```javascript
await Promise.all([
  api.updateFlowMedia(id1),
  api.updateFlowMedia(id2)
]);
```

2. **Reuse API instance**: Khởi tạo 1 lần, dùng nhiều lần
```javascript
const api = new Veo3FlowApi(config);
// Reuse cho nhiều generations
```

3. **Cache uploaded images**: Tránh upload lại ảnh đã có mediaId
```javascript
if (imageData.uploadedMediaId) {
  return imageData.uploadedMediaId; // Use cached
}
```

---

## 🐛 Troubleshooting

### Lỗi: "Need at least 2 images for video generation"
- **Nguyên nhân**: generateImages trả về < 2 ảnh
- **Fix**: Kiểm tra `numImages` option và response

### Lỗi: "All video models failed"
- **Nguyên nhân**: Cả 2 models đều bị reject
- **Fix**: Kiểm tra mediaIds format (phải là UUID), không phải workflow_xxx

### Lỗi: 401 Unauthorized
- **Nguyên nhân**: Token hết hạn hoặc cookies thiếu
- **Fix**: Refresh token từ Excel, đảm bảo cookies đầy đủ

### Lỗi: ProjectId/SceneId undefined
- **Nguyên nhân**: Config không được truyền đúng
- **Fix**: Đảm bảo khởi tạo với projectId + sceneId hợp lệ

---

## 📦 Export & Integration

Module hỗ trợ cả browser và Node.js:

**Browser**:
```html
<script src="veo3FlowApi.js"></script>
<script>
  const { Veo3FlowApi } = window;
</script>
```

**Node.js** (nếu cần):
```javascript
const { Veo3FlowApi } = require('./veo3FlowApi.js');
```

**ES6 Module** (có thể convert):
```javascript
export class Veo3FlowApi { ... }
```

---

## ✅ Checklist integration

- [ ] Import veo3FlowApi.js vào HTML
- [ ] Khởi tạo API instance với lane config
- [ ] Test generateImages() với 1 prompt đơn giản
- [ ] Test generateVideo() với 2 mediaIds
- [ ] Test full workflow với generateImageAndVideo()
- [ ] Kiểm tra fallback logic (model 1 → model 2)
- [ ] Test continue mode với imageInputs
- [ ] Xử lý errors và hiển thị messages cho user
- [ ] Implement polling để track video generation status

---

**Module sẵn sàng sử dụng! 🎉**
