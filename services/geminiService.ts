import { GoogleGenAI, Type } from "@google/genai";
import { AdRequestData, SocialPlatform, VideoQuality } from "../types";

export const checkApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const promptForApiKey = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  } else {
    // If not in AI Studio, we won't show alert here, we just rely on manual key
    console.log("AI Studio environment not detected.");
  }
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    // Lightweight request to check if key is valid
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: 'test' }] },
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (error) {
    console.warn("API Key validation failed:", error);
    return false;
  }
};

/**
 * Maps frontend platform selection to Veo aspect ratio
 */
const getAspectRatio = (platform: SocialPlatform): "16:9" | "9:16" => {
  switch (platform) {
    case SocialPlatform.YOUTUBE_SHORTS:
    case SocialPlatform.INSTAGRAM_REELS:
      return "9:16";
    case SocialPlatform.PORTRAIT_GENERIC:
      return "9:16"; 
    case SocialPlatform.LINKEDIN_FEED:
    default:
      return "16:9";
  }
};

/**
 * Maps frontend quality to Veo resolution
 */
const getResolution = (quality: VideoQuality): "720p" | "1080p" => {
  return quality === VideoQuality.Q_1080P ? "1080p" : "720p";
};

/**
 * Helper to strip markdown code blocks if present
 */
const cleanJsonString = (str: string): string => {
  if (!str) return '{}';
  // Remove markdown code blocks ```json ... ``` or just ``` ... ```
  let cleaned = str.replace(/```json/g, '').replace(/```/g, '');
  return cleaned.trim();
};

export type GenerationStage = 'analyzing' | 'generating_image' | 'generating_video' | 'complete' | 'failed';

interface GenerationResult {
  videoUri: string;
  imageUri?: string;
}

/**
 * Main Orchestrator
 */
export const generateAdCampaign = async (
  data: AdRequestData,
  manualApiKey: string,
  onProgress: (stage: GenerationStage, message: string) => void
): Promise<GenerationResult> => {
  
  // Prioritize manual key, then fallback to environment variable
  const rawKey = manualApiKey || process.env.API_KEY;
  const currentKey = rawKey ? rawKey.trim() : '';
  
  if (!currentKey || currentKey === 'undefined') {
     console.error("API Key check failed: Key is missing.");
     throw new Error("API key not valid (empty). Please enter a valid API key.");
  }
  
  console.log(`[GeminiService] Initializing with key length: ${currentKey.length}`);

  // Initialize AI Client
  const ai = new GoogleGenAI({ apiKey: currentKey });

  try {
    // --- STEP 1: VISION ANALYSIS ---
    onProgress('analyzing', 'Analyzing product and drafting creative brief...');
    
    const cleanImageBase64 = data.image.split(',')[1] || data.image;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanImageBase64
            }
          },
          {
            text: `You are an expert creative director. Analyze this product image and the user's description: "${data.description}".
            
            Target Platform: ${data.platform}
            
            Create a creative brief for a video ad. Return a JSON object with:
            1. "image_prompt": A highly detailed prompt to generate a polished, cinematic version of this product image suitable for a high-end ad. Describe lighting, environment, and composition. The goal is to enhance the product, not replace it completely.
            2. "video_prompt": A prompt for a video generation model (Veo) to animate the scene. Describe camera movement (e.g., slow pan, zoom, orbit) and subject motion (e.g., steam rising, light glimmering, cloth moving) that fits the mood.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            image_prompt: { type: Type.STRING },
            video_prompt: { type: Type.STRING }
          },
          required: ["image_prompt", "video_prompt"]
        }
      }
    });

    const jsonText = analysisResponse.text || '{}';
    let creativeBrief;
    try {
        creativeBrief = JSON.parse(cleanJsonString(jsonText));
    } catch (e) {
        console.error("JSON Parse Error:", e, "Received:", jsonText);
        throw new Error("Failed to parse creative brief from AI.");
    }

    if (!creativeBrief.image_prompt || !creativeBrief.video_prompt) {
      throw new Error("Failed to generate complete creative brief.");
    }
    console.log("Creative Brief:", creativeBrief);


    // --- STEP 2: IMAGE GENERATION (Nano Banana) ---
    onProgress('generating_image', 'Creating high-fidelity ad visual...');

    const imageGenResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanImageBase64
            }
          },
          {
            text: `Generate a high-quality social media ad image based on this input image. ${creativeBrief.image_prompt}`
          }
        ]
      }
    });

    let generatedImageBase64 = '';
    
    if (imageGenResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageGenResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!generatedImageBase64) {
      console.warn("No image generated, falling back to original");
      generatedImageBase64 = cleanImageBase64;
    }


    // --- STEP 3: VIDEO GENERATION (Veo) ---
    onProgress('generating_video', 'Rendering cinematic video (this may take a minute)...');

    let videoOperation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: creativeBrief.video_prompt,
      image: {
        imageBytes: generatedImageBase64,
        mimeType: 'image/png'
      },
      config: {
        numberOfVideos: 1,
        resolution: getResolution(data.quality),
        aspectRatio: getAspectRatio(data.platform)
      }
    });

    while (!videoOperation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      videoOperation = await ai.operations.getVideosOperation({ operation: videoOperation });
      
      // Check for operational errors during polling
      if (videoOperation.error) {
        throw new Error(`Video Generation Error: ${videoOperation.error.message || 'Unknown error'}`);
      }
    }

    const videoUri = videoOperation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("Video generation completed but no URI returned.");
    }

    // Safely append API key to URL for download
    let finalVideoUrl = videoUri;
    try {
        const urlObj = new URL(videoUri);
        urlObj.searchParams.append('key', currentKey);
        finalVideoUrl = urlObj.toString();
    } catch(e) {
        console.error("URL Construction error", e);
        finalVideoUrl = `${videoUri}&key=${currentKey}`;
    }

    // --- VERIFICATION STEP ---
    // Verify we can actually access the file (checking for 403 Forbidden)
    // before showing success to the user.
    try {
      const checkResponse = await fetch(finalVideoUrl, { method: 'HEAD', referrerPolicy: 'no-referrer' });
      if (checkResponse.status === 403) {
        throw new Error("Permission Denied (403). The generated video exists but the API Key does not have permission to download it. Please check your API key permissions.");
      }
    } catch (e: any) {
      // If network error, we might ignore, but if it's the 403 error we just threw, rethrow it.
      if (e.message && e.message.includes("Permission Denied")) {
        throw e;
      }
      console.warn("Could not verify video URL accessibility, proceeding anyway:", e);
    }
    
    onProgress('complete', 'Ad generation complete!');

    return {
      videoUri: finalVideoUrl,
      imageUri: `data:image/png;base64,${generatedImageBase64}`
    };

  } catch (error) {
    console.error("Generation Process Failed:", error);
    onProgress('failed', 'An error occurred.');
    throw error;
  }
};