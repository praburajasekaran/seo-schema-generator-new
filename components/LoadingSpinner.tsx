import React, { useState, useEffect } from 'react';

const LoadingSpinner: React.FC = () => {
  const [currentBenefit, setCurrentBenefit] = useState(0);

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
    const interval = setInterval(() => {
      setCurrentBenefit((prev) => (prev + 1) % benefits.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [benefits.length]);

  return (
    <div className="flex flex-col items-center justify-center my-16 max-w-2xl mx-auto">
      {/* Main spinner */}
      <div className="relative mb-8">
        <div className="w-16 h-16 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-brand-accent rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Loading text */}
      <p className="text-slate-600 dark:text-text-secondary text-lg font-medium mb-8">
        Analyzing content and generating schemas...
      </p>

      {/* Benefits showcase */}
      <div className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
        <div className="text-center h-48 flex flex-col justify-center">
          <div className="text-4xl mb-3 animate-bounce">
            {benefits[currentBenefit].icon}
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-text-primary mb-2">
            {benefits[currentBenefit].title}
          </h3>
          <p className="text-slate-600 dark:text-text-secondary leading-relaxed px-2">
            {benefits[currentBenefit].description}
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center mt-6 space-x-2">
          {benefits.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentBenefit 
                  ? 'bg-brand-accent scale-125' 
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Subtle encouragement */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
        This usually takes 10-15 seconds. We're working hard to find the best schemas for your content!
      </p>
    </div>
  );
};

export default LoadingSpinner;