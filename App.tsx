import React, { useState, useEffect } from 'react';
import { Layout } from './components/ui/Layout';
import { ImageUpload } from './components/ImageUpload';
import { PLATFORMS, SocialPlatform, VideoQuality, AdRequestData } from './types';
import { generateAdCampaign, checkApiKey, promptForApiKey, validateApiKey, GenerationStage } from './services/geminiService';
import { 
  Send, 
  CheckCircle2, 
  Youtube, 
  Instagram, 
  Linkedin, 
  Smartphone,
  Loader2,
  AlertTriangle,
  Video,
  Play,
  Download,
  Sparkles,
  Key,
  ShieldCheck,
  Ban,
  ImageIcon,
  Mail
} from 'lucide-react';

const PlatformIcon = ({ name, className }: { name: string; className?: string }) => {
  switch (name) {
    case 'youtube': return <Youtube className={className} />;
    case 'instagram': return <Instagram className={className} />;
    case 'linkedin': return <Linkedin className={className} />;
    default: return <Smartphone className={className} />;
  }
};

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [manualApiKey, setManualApiKey] = useState('');
  
  // Validation State
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>(SocialPlatform.INSTAGRAM_REELS);
  const [quality, setQuality] = useState<VideoQuality>(VideoQuality.Q_720P);
  const [email, setEmail] = useState('');
  
  const [status, setStatus] = useState<GenerationStage | 'idle'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey().then(setApiKeyReady);
  }, []);

  const handleConnect = async () => {
    try {
      await promptForApiKey();
      setApiKeyReady(true);
    } catch (e) {
      console.error("Failed to connect API key", e);
    }
  };

  const handleValidateKey = async () => {
    if (!manualApiKey) return;
    setIsValidatingKey(true);
    setKeyValidationStatus('idle');
    try {
      const isValid = await validateApiKey(manualApiKey);
      setKeyValidationStatus(isValid ? 'valid' : 'invalid');
    } catch (e) {
      setKeyValidationStatus('invalid');
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasKey = apiKeyReady || (manualApiKey && manualApiKey.length > 10);
    
    if (!hasKey) {
      if (!manualApiKey) {
        await handleConnect();
        return;
      }
    }
    
    if (!image) {
      setErrorMessage('Please upload a product image.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please provide a product description.');
      return;
    }

    setStatus('analyzing');
    setErrorMessage('');
    setStatusMessage('Initializing AI agents...');
    setResultVideoUrl(null);
    setResultImageUrl(null);

    const payload: AdRequestData = {
      image,
      description,
      platform,
      quality,
      email,
    };

    try {
      const result = await generateAdCampaign(payload, manualApiKey, (stage, message) => {
        setStatus(stage);
        setStatusMessage(message);
      });
      
      setResultVideoUrl(result.videoUri);
      if (result.imageUri) {
        setResultImageUrl(result.imageUri);
      }
    } catch (error: any) {
      console.error("Full Error Object:", error);
      setStatus('failed');
      
      let msg = error.message || '';
      if (error.error && error.error.message) {
        msg = error.error.message;
      } else if (error.toString && typeof error.toString === 'function') {
        const strErr = error.toString();
        if (strErr !== '[object Object]') msg = strErr;
      }

      if (msg.includes('API key not valid') || msg.includes('400') || msg.includes('403') || msg.includes('API_KEY_INVALID')) {
         setApiKeyReady(false);
         setErrorMessage(`API Permission Error: ${msg}. Try a different API key.`);
      } else {
         setErrorMessage(msg || 'Failed to generate video. Please try again.');
      }
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResultVideoUrl(null);
    setResultImageUrl(null);
    setStatusMessage('');
  };

  const getMailToLink = () => {
    if (!resultVideoUrl) return '#';
    const subject = encodeURIComponent("Your SocialAds GenAI Campaign");
    const body = encodeURIComponent(`Here is your AI generated video ad:\n\n${resultVideoUrl}\n\nGenerated with SocialAds GenAI.`);
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  // --- RESULT VIEW ---
  if (status === 'complete' && resultVideoUrl) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto mt-8 animate-in fade-in duration-500">
          <div className="text-center mb-10">
            <div className="bg-green-500/10 text-green-400 p-4 rounded-full inline-flex mb-6 ring-1 ring-green-500/30">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Campaign Generated!</h2>
            <p className="text-slate-400">
              Your assets are ready.
            </p>
            {email && (
              <a 
                href={getMailToLink()}
                className="inline-flex items-center gap-2 mt-4 text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Click to email link to {email}
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* VIDEO RESULT */}
            <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
              <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center gap-2">
                <Video className="w-4 h-4 text-pink-400" />
                <h3 className="font-semibold text-slate-200">Generated Video Ad</h3>
              </div>
              <div className="relative aspect-[9/16] md:aspect-video bg-black flex-grow">
                <video 
                  key={resultVideoUrl} // Forces remount on new url
                  controls 
                  autoPlay 
                  muted // Required for autoplay
                  loop 
                  playsInline
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                >
                  <source src={resultVideoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                <a 
                  href={resultVideoUrl} 
                  download="social-ad.mp4"
                  target="_blank"
                  rel="noopener noreferrer" 
                  referrerPolicy="no-referrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Video
                </a>
                <a 
                  href={getMailToLink()}
                  className="flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                  title="Share via Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* IMAGE RESULT */}
            {resultImageUrl && (
              <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-slate-200">Generated Base Frame</h3>
                </div>
                <div className="relative aspect-square bg-slate-900 flex-grow flex items-center justify-center overflow-hidden">
                  <img 
                    src={resultImageUrl} 
                    alt="Generated Ad Frame" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 bg-slate-800 border-t border-slate-700">
                   <a 
                    href={resultImageUrl} 
                    download="generated-frame.png"
                    className="flex items-center justify-center gap-2 w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download Image
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-medium transition-colors border border-slate-700 hover:border-slate-600"
            >
              <Sparkles className="w-5 h-5" /> Create Another Campaign
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // --- PROGRESS VIEW ---
  if (['analyzing', 'generating_image', 'generating_video'].includes(status)) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto mt-20 text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              {status === 'analyzing' && <Sparkles className="w-8 h-8 text-brand-400 animate-pulse" />}
              {status === 'generating_image' && <Video className="w-8 h-8 text-purple-400 animate-pulse" />}
              {status === 'generating_video' && <Play className="w-8 h-8 text-pink-400 animate-pulse" />}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            {status === 'analyzing' && 'Step 1: AI Vision Analysis'}
            {status === 'generating_image' && 'Step 2: Designing Visuals'}
            {status === 'generating_video' && 'Step 3: Rendering Video'}
          </h2>
          <p className="text-slate-400 text-lg animate-pulse">{statusMessage}</p>

          <div className="mt-8 flex justify-center gap-2">
            <div className={`h-2 w-16 rounded-full transition-colors ${status === 'analyzing' ? 'bg-brand-500' : 'bg-brand-500'}`}></div>
            <div className={`h-2 w-16 rounded-full transition-colors ${['generating_image', 'generating_video'].includes(status) ? 'bg-purple-500' : 'bg-slate-700'}`}></div>
            <div className={`h-2 w-16 rounded-full transition-colors ${status === 'generating_video' ? 'bg-pink-500' : 'bg-slate-700'}`}></div>
          </div>
        </div>
      </Layout>
    );
  }

  // --- FORM VIEW ---
  return (
    <Layout>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Create Viral Social Ads <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">
                in Seconds
              </span>
            </h1>
            <p className="text-slate-400 text-lg">
              Upload your product image. Our AI agents will analyze it, design a scene, and render a cinematic video for your chosen platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* API Key Input */}
            <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <Key className="w-4 h-4 text-brand-400" />
                  <span>Google AI API Key</span>
                </div>
                {keyValidationStatus === 'valid' && (
                  <span className="flex items-center gap-1 text-xs text-green-400 font-medium bg-green-400/10 px-2 py-1 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Validated
                  </span>
                )}
                {keyValidationStatus === 'invalid' && (
                  <span className="flex items-center gap-1 text-xs text-red-400 font-medium bg-red-400/10 px-2 py-1 rounded-full">
                    <Ban className="w-3 h-3" /> Invalid Key
                  </span>
                )}
              </div>
              
              <p className="text-xs text-slate-500">
                Enter your key to enable generation. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">Get a key here</a>.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="password"
                  value={manualApiKey}
                  onChange={(e) => {
                    setManualApiKey(e.target.value);
                    setKeyValidationStatus('idle');
                  }}
                  placeholder="AIza..."
                  className={`
                    flex-grow bg-slate-900/50 border rounded-lg px-4 py-2 text-slate-200 placeholder-slate-600 focus:ring-1 focus:outline-none text-sm font-mono transition-colors
                    ${keyValidationStatus === 'invalid' 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                      : keyValidationStatus === 'valid'
                        ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/20'
                        : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/20'
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={handleValidateKey}
                  disabled={isValidatingKey || !manualApiKey}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 min-w-[100px] justify-center"
                >
                  {isValidatingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking
                    </>
                  ) : (
                    'Validate'
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                 <div className={`w-2 h-2 rounded-full ${apiKeyReady ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                 <span className="text-xs text-slate-500">
                   {apiKeyReady ? 'Environment Key Detected (AI Studio)' : 'Or use environment key'}
                 </span>
                 {!apiKeyReady && (
                   <button 
                     type="button" 
                     onClick={handleConnect} 
                     className="text-xs text-brand-400 hover:text-brand-300 ml-auto"
                   >
                     Try Connect Button
                   </button>
                 )}
              </div>
            </div>

            {/* Image Upload */}
            <ImageUpload selectedImage={image} onImageSelect={setImage} />

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-300">
                Product Description
                <span className="text-slate-500 ml-2 font-normal">
                  ({description.length}/300 chars)
                </span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                placeholder="Luxury leather handbag, summer collection, vibrant colors..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all h-32 resize-none"
              />
            </div>

            {/* Platform Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">Target Platform</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`
                      relative flex items-center gap-3 p-4 rounded-xl border transition-all text-left
                      ${platform === p.id 
                        ? 'bg-brand-500/10 border-brand-500 ring-1 ring-brand-500' 
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                      }
                    `}
                  >
                    <div className={`p-2 rounded-lg ${platform === p.id ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                      <PlatformIcon name={p.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`font-medium ${platform === p.id ? 'text-white' : 'text-slate-300'}`}>
                        {p.label}
                      </div>
                      <div className="text-xs text-slate-500">Aspect Ratio: {p.aspectRatio}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">Output Quality</label>
              <div className="flex gap-4">
                {[VideoQuality.Q_720P, VideoQuality.Q_1080P].map((q) => (
                  <label key={q} className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="quality"
                      value={q}
                      checked={quality === q}
                      onChange={() => setQuality(q)}
                      className="peer hidden"
                    />
                    <div className="
                      h-full flex flex-col items-center justify-center p-4 rounded-xl border border-slate-700 bg-slate-800/50 
                      peer-checked:bg-brand-500/10 peer-checked:border-brand-500 peer-checked:text-brand-400
                      hover:bg-slate-800 transition-all text-slate-400
                    ">
                      <span className="font-bold text-lg">{q}</span>
                      <span className="text-xs opacity-70">
                        {q === VideoQuality.Q_720P ? 'Faster Generation' : 'High Definition'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Email & Submit */}
            <div className="pt-4 border-t border-slate-800 space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marketing@yourcompany.com"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {status === 'failed' && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-lg">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status !== 'idle' && status !== 'failed'}
                className={`
                  w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg text-white shadow-lg shadow-brand-500/20
                  transition-all duration-200
                  ${!apiKeyReady && !manualApiKey 
                    ? 'bg-slate-700 cursor-not-allowed opacity-70' 
                    : 'bg-brand-600 hover:bg-brand-500'
                  }
                  transform hover:-translate-y-0.5
                `}
              >
                <Send className="w-5 h-5" />
                Generate Video Ad
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Info / Sidebar */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="sticky top-28 space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-white mb-4">Pipeline Architecture</h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30 shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-indigo-300">1. Vision Agent</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      <span className="text-slate-200">Gemini 3 Flash</span> analyzes your product features and generates a professional creative brief and scene description.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold border border-purple-500/30 shrink-0">
                    <Video size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-300">2. Asset Generation</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      <span className="text-slate-200">Gemini 2.5 Flash Image</span> (Nano Banana) takes the brief and your image to create a high-fidelity cinematic base frame.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold border border-pink-500/30 shrink-0">
                    <Play size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-pink-300">3. Video Synthesis</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      <span className="text-slate-200">Veo 3.1</span> brings the scene to life with AI-generated camera movement and physics.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;