import { useState } from 'react';
import { InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface EbayAuthGuideProps {
  onManualToken?: (token: string) => void;
}

export default function EbayAuthGuide({ onManualToken }: EbayAuthGuideProps) {
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleManualSubmit = () => {
    if (manualToken.trim() && onManualToken) {
      onManualToken(manualToken.trim());
      setManualToken('');
      setShowManualInput(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <InformationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            eBay Authentication Guide
          </h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>
              <strong>eBay OAuth 2.0 Authentication:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You should see a modern eBay sign-in form</li>
              <li>If you see "You've signed out", click "Sign in again"</li>
              <li>Sign in with your eBay account</li>
              <li>You'll be redirected back automatically</li>
            </ul>
            
            <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <strong>Legacy eBay Flow:</strong> eBay's legacy authentication doesn't 
                  redirect automatically. You may need to manually copy the token from the URL.
                </div>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-xs text-yellow-700 hover:text-yellow-800 underline"
              >
                Having trouble? Enter token manually
              </button>
            </div>

            {showManualInput && (
              <div className="mt-3 p-3 bg-white rounded border border-yellow-200">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Paste eBay Token:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="v^1.1#i^1#..."
                    className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualToken.trim()}
                    className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
