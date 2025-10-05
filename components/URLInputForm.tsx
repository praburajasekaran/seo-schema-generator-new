import React from 'react';

interface URLInputFormProps {
  url: string;
  setUrl: (url: string) => void;
  onAnalyze: (url:string) => void;
  isLoading: boolean;
}

const URLInputForm: React.FC<URLInputFormProps> = ({ url, setUrl, onAnalyze, isLoading }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze(url);
  };

  return (
    <div className="slide-in-premium">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-end">
        <div className="relative flex-grow">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input-field w-full pt-6 pb-2 px-4 sm:px-6 text-base sm:text-lg min-h-[3.5rem] sm:min-h-[4rem] peer"
            required
            disabled={isLoading}
          />
          <label 
            htmlFor="url-input" 
            className={`absolute left-4 sm:left-6 transition-all duration-200 pointer-events-none ${
              url || isLoading 
                ? 'top-2 text-xs text-slate-500 dark:text-slate-400' 
                : 'top-4 sm:top-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:text-blue-400'
            }`}
          >
            Web Page URL
          </label>
          {!url && !isLoading && (
            <div className="absolute left-4 sm:left-6 top-4 sm:top-5 text-sm sm:text-base text-slate-400 dark:text-slate-500 pointer-events-none">
              https://your-website.com/page-to-analyze
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary px-6 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-semibold flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-premium-lg whitespace-nowrap min-h-[3.5rem] sm:min-h-[4rem]"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-sm sm:text-base">Analyzing...</span>
            </>
          ) : (
            <>
              <span className="text-sm sm:text-base">Generate Schemas</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default URLInputForm;