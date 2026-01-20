export enum SocialPlatform {
  YOUTUBE_SHORTS = 'YouTube Shorts',
  INSTAGRAM_REELS = 'Instagram Reels',
  LINKEDIN_FEED = 'LinkedIn/Feed',
  PORTRAIT_GENERIC = 'Portrait Generic',
}

export enum VideoQuality {
  Q_720P = '720p',
  Q_1080P = '1080p',
}

export interface AdRequestData {
  image: string; // Base64 string
  description: string;
  platform: SocialPlatform;
  quality: VideoQuality;
  email: string;
}

export interface PlatformConfig {
  id: SocialPlatform;
  label: string;
  aspectRatio: string;
  icon: string;
}

export const PLATFORMS: PlatformConfig[] = [
  { id: SocialPlatform.YOUTUBE_SHORTS, label: 'YouTube Shorts', aspectRatio: '9:16', icon: 'youtube' },
  { id: SocialPlatform.INSTAGRAM_REELS, label: 'Instagram Reels', aspectRatio: '9:16', icon: 'instagram' },
  { id: SocialPlatform.LINKEDIN_FEED, label: 'LinkedIn Feed', aspectRatio: '16:9', icon: 'linkedin' },
  { id: SocialPlatform.PORTRAIT_GENERIC, label: 'Portrait Generic', aspectRatio: '3:4', icon: 'smartphone' },
];