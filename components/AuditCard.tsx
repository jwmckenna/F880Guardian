import React, { useState } from 'react';
import { AuditQuestion, AuditResponse } from '../types';
import { CheckCircle2, XCircle, Ban, MessageSquare, Loader2 } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { analyzeImageFinding } from '../services/geminiService';

interface AuditCardProps {
  question: AuditQuestion;
  response?: AuditResponse;
  onUpdate: (response: AuditResponse) => void;
}

export const AuditCard: React.FC<AuditCardProps> = ({ question, response, onUpdate }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const status = response?.status;

  const handleStatus = (newStatus: 'pass' | 'fail' | 'na') => {
    onUpdate({
      questionId: question.id,
      status: newStatus,
      comment: response?.comment || '',
      imageUri: response?.imageUri
    });
  };

  const handleComment = (text: string) => {
    onUpdate({
      ...response!, // assume exists if typing comment
      questionId: question.id,
      status: status || 'pass', // Default to pass if undefined but commenting
      comment: text
    });
  };

  const handleImage = async (base64: string) => {
    const currentResponse = {
      questionId: question.id,
      status: status || 'fail', // Usually adding a photo implies a finding
      comment: response?.comment || '',
      imageUri: base64
    };
    
    onUpdate(currentResponse);

    // If image added, trigger auto-analysis
    if (base64 && !currentResponse.comment) {
      setIsAnalyzing(true);
      const analysis = await analyzeImageFinding(base64);
      onUpdate({
        ...currentResponse,
        comment: analysis
      });
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
      <h3 className="text-sm font-medium text-gray-800 mb-3">{question.text}</h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleStatus('pass')}
          className={`flex-1 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${
            status === 'pass' 
              ? 'bg-green-100 text-green-700 border-green-200 border font-semibold' 
              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs sm:text-sm">Met</span>
        </button>

        <button
          onClick={() => handleStatus('fail')}
          className={`flex-1 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${
            status === 'fail' 
              ? 'bg-red-100 text-red-700 border-red-200 border font-semibold' 
              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span className="text-xs sm:text-sm">Unmet</span>
        </button>

        <button
          onClick={() => handleStatus('na')}
          className={`w-16 py-2 rounded-lg flex justify-center items-center transition-all ${
            status === 'na' 
              ? 'bg-gray-200 text-gray-700 font-semibold' 
              : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          <Ban className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Section for Failures or Comments */}
      {(status === 'fail' || status === 'pass') && (
        <div className="animate-fade-in space-y-3">
          
          {/* Image Capture */}
          <CameraCapture onCapture={handleImage} initialImage={response?.imageUri} />

          {/* Comment Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MessageSquare className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={isAnalyzing ? "AI is analyzing photo..." : "Add observation notes..."}
              value={response?.comment || ''}
              onChange={(e) => handleComment(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isAnalyzing}
            />
             {isAnalyzing && (
               <div className="absolute right-3 top-2.5">
                 <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};