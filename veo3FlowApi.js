/**
 * Veo3 Flow API Module
 *
 * Reusable module for Google Labs Flow API integration
 * Supports: Image generation, Flow Media updates, and Video generation with fallback
 *
 * Usage:
 *   import { Veo3FlowApi } from './veo3FlowApi.js';
 *   const api = new Veo3FlowApi(tokenConfig);
 *   const images = await api.generateImages(prompt, options);
 *   const video = await api.generateVideo(mediaIds, prompt, options);
 */

class Veo3FlowApi {
  constructor(config = {}) {
    this.projectId = config.projectId;
    this.sceneId = config.sceneId;
    this.authorization = config.authorization;
    this.proxy = config.proxy;
    this.cookies = config.cookies;
    this.serverUrl = config.serverUrl || '';

    // Default video models with fallback
    this.videoModels = [
      'veo_3_1_i2v_s_fast_fl_ultra_relaxed',
      'veo_3_1_i2v_s_fast_ultra_fl'
    ];
  }

  /**
   * Generate session ID in Google's format
   */
  generateSessionId() {
    return `;${Date.now()}`;
  }

  /**
   * Generate images using Flow API (batchGenerateImages)
   *
   * @param {string} prompt - Text prompt for image generation
   * @param {Object} options - Generation options
   * @param {string} options.aspectRatio - IMAGE_16_9, IMAGE_9_16, IMAGE_4_3, IMAGE_1_1
   * @param {number} options.numImages - Number of images (1-4)
   * @param {string} options.guidanceScale - LOW, MEDIUM, or HIGH
   * @param {Array} options.imageInputs - Optional array of {mediaId, role} for continue mode
   * @returns {Promise<Object>} Generation result with mediaIds
   */
  async generateImages(prompt, options = {}) {
    const {
      aspectRatio = 'IMAGE_16_9',
      numImages = 4,
      guidanceScale = 'MEDIUM',
      imageInputs = []
    } = options;

    const sessionId = this.generateSessionId();

    const requestBody = {
      projectId: this.projectId,
      sceneId: this.sceneId,
      prompts: [prompt],
      aspectRatio: aspectRatio,
      numberOfImages: numImages,
      guidanceScale: guidanceScale
    };

    // Add imageInputs for continue mode
    if (imageInputs && imageInputs.length > 0) {
      requestBody.imageInputs = imageInputs;
    }

    const url = `https://videofx-prd.googleapis.com/v1/projects/${this.projectId}/flowMedia:batchGenerateImages`;

    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'authorization': this.authorization,
      'content-type': 'application/json+protobuf',
      'origin': 'https://labs.google',
      'referer': 'https://labs.google/',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'x-client-data': 'CIq2yQEIorbJAQipncoBCN6iywEIlaHLAQj0x8wBCOPczgEYqfzNARj6kM4B',
      'x-goog-api-client': 'gdcl/7.2.0 gl-js/ gdcl/7.2.0',
      'x-goog-ext-353267353-jspb': '[null,null,null,116]'
    };

    if (this.cookies) {
      headers['cookie'] = this.cookies;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`batchGenerateImages failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        sessionId: sessionId,
        mediaIds: result.mediaIds || [],
        projectId: this.projectId,
        sceneId: this.sceneId,
        data: result
      };
    } catch (error) {
      console.error('Error in generateImages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update flow media to mark images as ingredients (for continue mode)
   *
   * @param {string} mediaId - Media ID to update
   * @param {Object} options - Update options
   * @param {boolean} options.isIngredient - Mark as ingredient (default: true)
   * @returns {Promise<Object>} Update result
   */
  async updateFlowMedia(mediaId, options = {}) {
    const { isIngredient = true } = options;

    const requestBody = {
      "0": {
        "json": {
          "projectId": this.projectId,
          "sceneId": this.sceneId,
          "flowMedia": {
            "mediaId": mediaId,
            "isIngredient": isIngredient
          }
        }
      }
    };

    const url = 'https://labs.google/fx/api/trpc/videoFx.updateFlowMedia?batch=1';

    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'authorization': this.authorization,
      'content-type': 'application/json',
      'origin': 'https://labs.google',
      'referer': 'https://labs.google/fx/tools/video-fx',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'x-client-data': 'CIq2yQEIorbJAQipncoBCN6iywEIlaHLAQj0x8wBCOPczgEYqfzNARj6kM4B',
      'x-same-domain': '1'
    };

    if (this.cookies) {
      headers['cookie'] = this.cookies;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`updateFlowMedia failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        mediaId: mediaId,
        isIngredient: isIngredient,
        data: result
      };
    } catch (error) {
      console.error('Error in updateFlowMedia:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate video from images with automatic fallback
   *
   * @param {Array<string>} mediaIds - Array of 2 media IDs [startImage, endImage]
   * @param {string} prompt - Video generation prompt
   * @param {Object} options - Video generation options
   * @param {string} options.aspectRatio - VIDEO_16_9, VIDEO_9_16, etc.
   * @param {number} options.durationSeconds - Video duration (default: 5)
   * @param {Array<string>} options.modelKeys - Optional custom model keys for fallback
   * @returns {Promise<Object>} Video generation result
   */
  async generateVideo(mediaIds, prompt, options = {}) {
    const {
      aspectRatio = 'VIDEO_16_9',
      durationSeconds = 5,
      modelKeys = this.videoModels
    } = options;

    if (!Array.isArray(mediaIds) || mediaIds.length !== 2) {
      throw new Error('generateVideo requires exactly 2 media IDs [startImage, endImage]');
    }

    // Try each model key with fallback
    let lastError = null;

    for (let i = 0; i < modelKeys.length; i++) {
      const videoModelKey = modelKeys[i];

      try {
        console.log(`🎬 Attempting video generation with model: ${videoModelKey}`);

        const result = await this._generateVideoWithModel(
          mediaIds,
          prompt,
          aspectRatio,
          durationSeconds,
          videoModelKey
        );

        if (result.success) {
          console.log(`✅ Video generation successful with model: ${videoModelKey}`);
          return result;
        }

        lastError = result.error;
      } catch (error) {
        console.log(`❌ Model ${videoModelKey} failed: ${error.message}`);
        lastError = error.message;

        // If not the last model, continue to next
        if (i < modelKeys.length - 1) {
          console.log(`🔄 Falling back to next model...`);
          continue;
        }
      }
    }

    // All models failed
    return {
      success: false,
      error: `All video models failed. Last error: ${lastError}`
    };
  }

  /**
   * Internal method to generate video with specific model
   * @private
   */
  async _generateVideoWithModel(mediaIds, prompt, aspectRatio, durationSeconds, videoModelKey) {
    const sessionId = this.generateSessionId();

    const requestBody = {
      projectId: this.projectId,
      sceneId: this.sceneId,
      prompt: prompt,
      aspectRatio: aspectRatio,
      durationSeconds: durationSeconds,
      videoModelKey: videoModelKey,
      startImageGenerationMediaId: mediaIds[0],
      endImageGenerationMediaId: mediaIds[1]
    };

    const url = `https://labs.google/fx/api/trpc/videoFx.batchAsyncGenerateVideoStartAndEndImage?batch=1`;

    const payload = {
      "0": {
        "json": requestBody
      }
    };

    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'authorization': this.authorization,
      'content-type': 'application/json',
      'origin': 'https://labs.google',
      'referer': 'https://labs.google/fx/tools/video-fx',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'x-client-data': 'CIq2yQEIorbJAQipncoBCN6iywEIlaHLAQj0x8wBCOPczgEYqfzNARj6kM4B',
      'x-same-domain': '1'
    };

    if (this.cookies) {
      headers['cookie'] = this.cookies;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video generation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      sessionId: sessionId,
      videoModelKey: videoModelKey,
      projectId: this.projectId,
      sceneId: this.sceneId,
      mediaIds: mediaIds,
      data: result
    };
  }

  /**
   * Upload image to Veo3 and get media ID
   *
   * @param {string} imageBase64 - Base64 encoded image
   * @param {Object} options - Upload options
   * @param {string} options.aspectRatio - VIDEO_16_9, VIDEO_9_16, etc.
   * @returns {Promise<Object>} Upload result with mediaId
   */
  async uploadImage(imageBase64, options = {}) {
    const { aspectRatio = 'VIDEO_16_9' } = options;

    // Use server endpoint for upload
    const url = `${this.serverUrl}/api/veo3/upload-cropped-image`;

    const requestBody = {
      imageBase64: imageBase64,
      aspectRatio: aspectRatio,
      projectId: this.projectId,
      sceneId: this.sceneId,
      authorization: this.authorization,
      cookies: this.cookies,
      proxy: this.proxy
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return {
        success: true,
        mediaId: result.mediaId,
        projectId: result.projectId,
        sceneId: result.sceneId
      };
    } catch (error) {
      console.error('Error in uploadImage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete workflow: Generate images → Mark as ingredients → Generate video
   *
   * @param {string} imagePrompt - Prompt for image generation
   * @param {string} videoPrompt - Prompt for video generation
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Complete workflow result
   */
  async generateImageAndVideo(imagePrompt, videoPrompt, options = {}) {
    const {
      imageAspectRatio = 'IMAGE_16_9',
      videoAspectRatio = 'VIDEO_16_9',
      numImages = 4,
      durationSeconds = 5
    } = options;

    try {
      // Step 1: Generate images
      console.log('📸 Step 1: Generating images...');
      const imageResult = await this.generateImages(imagePrompt, {
        aspectRatio: imageAspectRatio,
        numImages: numImages
      });

      if (!imageResult.success) {
        throw new Error(`Image generation failed: ${imageResult.error}`);
      }

      const mediaIds = imageResult.mediaIds;
      if (!mediaIds || mediaIds.length < 2) {
        throw new Error('Need at least 2 images for video generation');
      }

      console.log(`✅ Generated ${mediaIds.length} images`);

      // Step 2: Mark first 2 images as ingredients
      console.log('🏷️  Step 2: Marking images as ingredients...');
      await Promise.all([
        this.updateFlowMedia(mediaIds[0], { isIngredient: true }),
        this.updateFlowMedia(mediaIds[1], { isIngredient: true })
      ]);

      console.log('✅ Images marked as ingredients');

      // Step 3: Generate video from first 2 images
      console.log('🎬 Step 3: Generating video...');
      const videoResult = await this.generateVideo(
        [mediaIds[0], mediaIds[1]],
        videoPrompt,
        {
          aspectRatio: videoAspectRatio,
          durationSeconds: durationSeconds
        }
      );

      if (!videoResult.success) {
        throw new Error(`Video generation failed: ${videoResult.error}`);
      }

      console.log('✅ Video generation complete');

      return {
        success: true,
        images: {
          mediaIds: mediaIds,
          prompt: imagePrompt
        },
        video: {
          sessionId: videoResult.sessionId,
          modelUsed: videoResult.videoModelKey,
          prompt: videoPrompt,
          data: videoResult.data
        }
      };
    } catch (error) {
      console.error('Error in generateImageAndVideo workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Continue mode: Generate new images from existing images, then create video
   *
   * @param {Array<Object>} imageInputs - Array of {mediaId, role} objects
   * @param {string} imagePrompt - Prompt for new image generation
   * @param {string} videoPrompt - Prompt for video generation
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Complete workflow result
   */
  async continueWithImages(imageInputs, imagePrompt, videoPrompt, options = {}) {
    const {
      imageAspectRatio = 'IMAGE_16_9',
      videoAspectRatio = 'VIDEO_16_9',
      numImages = 4,
      durationSeconds = 5
    } = options;

    try {
      // Step 1: Generate new images with imageInputs (continue mode)
      console.log('📸 Step 1: Generating images in continue mode...');
      const imageResult = await this.generateImages(imagePrompt, {
        aspectRatio: imageAspectRatio,
        numImages: numImages,
        imageInputs: imageInputs
      });

      if (!imageResult.success) {
        throw new Error(`Image generation failed: ${imageResult.error}`);
      }

      const mediaIds = imageResult.mediaIds;
      if (!mediaIds || mediaIds.length < 2) {
        throw new Error('Need at least 2 images for video generation');
      }

      console.log(`✅ Generated ${mediaIds.length} new images from existing ones`);

      // Step 2: Mark first 2 images as ingredients
      console.log('🏷️  Step 2: Marking images as ingredients...');
      await Promise.all([
        this.updateFlowMedia(mediaIds[0], { isIngredient: true }),
        this.updateFlowMedia(mediaIds[1], { isIngredient: true })
      ]);

      console.log('✅ Images marked as ingredients');

      // Step 3: Generate video
      console.log('🎬 Step 3: Generating video...');
      const videoResult = await this.generateVideo(
        [mediaIds[0], mediaIds[1]],
        videoPrompt,
        {
          aspectRatio: videoAspectRatio,
          durationSeconds: durationSeconds
        }
      );

      if (!videoResult.success) {
        throw new Error(`Video generation failed: ${videoResult.error}`);
      }

      console.log('✅ Video generation complete');

      return {
        success: true,
        images: {
          mediaIds: mediaIds,
          prompt: imagePrompt,
          inputImages: imageInputs
        },
        video: {
          sessionId: videoResult.sessionId,
          modelUsed: videoResult.videoModelKey,
          prompt: videoPrompt,
          data: videoResult.data
        }
      };
    } catch (error) {
      console.error('Error in continueWithImages workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Veo3FlowApi };
}
