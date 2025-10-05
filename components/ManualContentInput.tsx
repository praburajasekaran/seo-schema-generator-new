import React, { useState } from 'react';
import { FileText, X, AlertCircle } from 'lucide-react';

interface ManualContentInputProps {
  onContentSubmit: (content: string, pageTitle: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ManualContentInput: React.FC<ManualContentInputProps> = ({
  onContentSubmit,
  onCancel,
  isLoading
}) => {
  const [content, setContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && pageTitle.trim()) {
      onContentSubmit(content.trim(), pageTitle.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Manual Content Input</h2>
              <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">Enter content manually when automatic extraction fails</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm">
                <p className="font-medium text-amber-800 mb-1">Why use manual input?</p>
                <p className="text-amber-700">
                  Some websites use Cloudflare protection or other security measures that prevent automatic content extraction. 
                  You can copy and paste the main content from the page to generate schemas.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="pageTitle" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
              Page Title *
            </label>
            <input
              type="text"
              id="pageTitle"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="e.g., Australian Student Visa Rejection Reasons"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
              Page Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the main content from the page here. Include headings, paragraphs, and any relevant text that should be used for schema generation..."
              rows={8}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-sm sm:text-base"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 mt-2">
              Tip: Copy the main article content, headings, and any FAQ sections for best results.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || !pageTitle.trim() || isLoading}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm sm:text-base">Generating Schemas...</span>
                </>
              ) : (
                <span className="text-sm sm:text-base">Generate Schemas</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
