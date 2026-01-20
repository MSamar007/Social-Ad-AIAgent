import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (base64: string | null) => void;
  selectedImage: string | null;
}

const MAX_SIZE_MB = 5;

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, selectedImage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);

    // Validate type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG files are allowed.');
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File size must be less than ${MAX_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageSelect(result);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearImage = () => {
    onImageSelect(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Product Image
      </label>
      
      {selectedImage ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shadow-md">
          <img 
            src={selectedImage} 
            alt="Product Preview" 
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={clearImage}
              className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-200"
            >
              <X size={16} /> Remove Image
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative h-64 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center p-6
            ${isDragging 
              ? 'border-brand-500 bg-brand-500/10' 
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
            }
            ${error ? 'border-red-500/50 bg-red-500/5' : ''}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/jpeg, image/png"
            onChange={handleFileChange}
          />
          
          <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-700 text-slate-400'}`}>
            <UploadCloud className="w-8 h-8" />
          </div>
          
          <h3 className="text-lg font-semibold text-slate-200">
            {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
          </h3>
          <p className="text-slate-500 text-sm mt-2 max-w-xs">
            JPG or PNG up to {MAX_SIZE_MB}MB.
            <br/>High quality product shots work best.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
};