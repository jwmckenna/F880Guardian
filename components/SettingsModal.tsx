
import React, { useState, useEffect } from 'react';
import { X, Save, HelpCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { getScriptUrl, saveScriptUrl, GOOGLE_SCRIPT_CODE } from '../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(getScriptUrl());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveScriptUrl(url);
    onClose();
    window.location.reload(); 
  };

  const copyCode = () => {
    navigator.clipboard.writeText(GOOGLE_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Database Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Connect to Google Sheets
            </h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              To save audits to the cloud, you must deploy a Google Apps Script Web App and paste the URL below.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Google Apps Script Web App URL</label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline"
            >
              <HelpCircle className="w-4 h-4" />
              {showHelp ? 'Hide Setup Instructions' : 'Show Setup Instructions'}
            </button>

            {showHelp && (
              <div className="mt-4 space-y-4 animate-fade-in">
                <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                  <h4 className="font-bold text-gray-800 mb-2">Step 1: Get the Code</h4>
                  <p>Copy the code below. This is the server-side script that allows the app to talk to your Google Sheet.</p>
                  
                  <div className="relative mt-2">
                    <div className="absolute top-2 right-2">
                      <button 
                        onClick={copyCode}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <textarea 
                      readOnly
                      className="w-full h-32 p-3 text-[10px] font-mono bg-gray-800 text-gray-100 rounded-lg resize-none focus:outline-none"
                      value={GOOGLE_SCRIPT_CODE}
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                   <h4 className="font-bold text-gray-800 mb-2">Step 2: Deploy Script</h4>
                   <p>1. Create a new Google Sheet.</p>
                   <p>2. Go to <strong>Extensions &gt; Apps Script</strong>.</p>
                   <p>3. Paste the code you copied above (delete any existing code).</p>
                   <p>4. Click <strong>Deploy &gt; New Deployment</strong>.</p>
                   <p>5. Select <strong>Web app</strong>.</p>
                   <p>6. Set <em>Execute as</em>: <strong>Me</strong>.</p>
                   <p>7. Set <em>Who has access</em>: <strong>Anyone</strong>.</p>
                   <p>8. Click <strong>Deploy</strong> and copy the URL provided.</p>
                   <p>9. Paste that URL into the field above and click Save.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
};
