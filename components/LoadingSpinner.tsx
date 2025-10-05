import React, { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  loadingStage?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ loadingStage }) => {
  const [currentBenefit, setCurrentBenefit] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const benefits = [
    {
      icon: "🔍",
      title: "Enhanced Search Visibility",
      description: "Structured data helps search engines understand your content better, leading to richer search results with stars, prices, and enhanced features."
    },
    {
      icon: "📈",
      title: "Higher Click-Through Rates",
      description: "Rich snippets can increase CTR by up to 30% by making your results stand out in search pages with visual enhancements."
    },
    {
      icon: "🎯",
      title: "Better Content Understanding",
      description: "Schemas help search engines categorize your content accurately, improving relevance for your target keywords and search intent."
    },
    {
      icon: "⚡",
      title: "Voice Search Optimization",
      description: "Structured data is crucial for voice search results, helping you capture the growing voice search market effectively."
    },
    {
      icon: "🏆",
      title: "Competitive Advantage",
      description: "Most websites don't use schemas properly. You'll be ahead of 70% of your competition with proper implementation."
    }
  ];

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentBenefit((prev) => (prev + 1) % benefits.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [benefits.length, isPaused]);

  return (
    <div className="flex flex-col items-center justify-center my-12 sm:my-16 max-w-2xl mx-auto px-4">
      {/* Main spinner */}
      <div className="relative mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Loading text */}
      <p className="text-slate-600 dark:text-text-secondary text-base sm:text-lg font-medium mb-6 sm:mb-8 text-center">
        {loadingStage || "Analyzing content and generating schemas..."}
      </p>

      {/* Benefits showcase */}
      <div 
        className="relative w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-200/50 dark:border-slate-700/50 cursor-pointer transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-800/70"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="text-center h-40 sm:h-48 flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl mb-2 sm:mb-3 animate-bounce">
            {benefits[currentBenefit].icon}
          </div>
          {isPaused && (
            <div className="absolute top-2 right-2 text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-700/80 px-2 py-1 rounded-full">
             
            </div>
          )}
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-text-primary mb-2">
            {benefits[currentBenefit].title}
          </h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-text-secondary leading-relaxed px-2">
            {benefits[currentBenefit].description}
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
          {benefits.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentBenefit 
                  ? 'bg-blue-500 scale-125' 
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Subtle encouragement */}
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-4 sm:mt-6 text-center px-4">
        {loadingStage?.includes('Fetching') 
          ? "This may take 10-20 seconds for complex sites. We're using optimized scraping with multiple fallback methods!"
          : "This usually takes 5-10 seconds. We're working hard to find the best schemas for your content!"
        }
      </p>
    </div>
  );
};

export default LoadingSpinner;