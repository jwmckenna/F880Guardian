import React, { useState } from 'react';
import { Camera, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  initialImage?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, initialImage }) => {
  const [preview, setPreview] = useState<string | undefined>(initialImage);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onCapture(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setPreview(undefined);
    onCapture('');
  };

  return (
    <div className="mt-2">
      {!preview ? (
        <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center">
            <Camera className="w-6 h-6 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Add Photo Evidence</span>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleFileChange} 
          />
        </label>
      ) : (
        <div className="relative inline-block">
          <img 
            src={preview} 
            alt="Evidence" 
            className="h-32 w-auto rounded-lg border border-gray-200 object-cover" 
          />
          <button
            onClick={clearImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};