import React from 'react';
import { Sparkles, Video, Github } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-500 p-2 rounded-lg shadow-lg shadow-brand-500/20">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              SocialAds <span className="text-brand-400">GenAI</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span className="hidden md:flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Powered by Gemini & Veo
            </span>
            <a href="#" className="hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} SocialAds GenAI. Built By Samar.</p>
        </div>
      </footer>
    </div>
  );
};