import React, { useState, useEffect } from 'react';
import type { RecommendedSchema } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ErrorIcon } from './icons/ErrorIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import JsonSyntaxHighlighter from './JsonSyntaxHighlighter';

interface SchemaCardProps {
  schema: RecommendedSchema;
}

export const SchemaCard: React.FC<SchemaCardProps> = ({ schema }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [googleTestState, setGoogleTestState] = useState<'idle' | 'copied_and_opened'>('idle');

  const handleCopy = () => {
    let scriptContent = schema.jsonLd;
    // If the schema is invalid, the jsonLd might be our error object.
    // We should try to extract the original string from it for a better user experience.
    if (schema.validationStatus === 'invalid') {
      try {
        const parsedData = JSON.parse(schema.jsonLd);
        if (parsedData.originalString) {
          scriptContent = parsedData.originalString;
        }
      } catch (e) {
        // It's not our JSON error object, so just copy the content as is.
      }
    }
    navigator.clipboard.writeText(`<script type="application/ld+json">${scriptContent}</script>`);
    setIsCopied(true);
  };

  const handleTestWithGoogle = async () => {
    // This clipboard-first approach is simpler and will work 100% of the time.
    // We set state *before* opening the new window to ensure the user sees the feedback.
    try {
      await navigator.clipboard.writeText(schema.jsonLd); // Copy pretty version for user readability
      setGoogleTestState('copied_and_opened');
      window.open('https://search.google.com/test/rich-results', '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to copy text or open window:', err);
      // Optionally, set an error state here to inform the user.
    }
  };


  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);
  
  useEffect(() => {
    if (googleTestState === 'copied_and_opened') {
      const timer = setTimeout(() => setGoogleTestState('idle'), 4000); // Give user more time to see the message
      return () => clearTimeout(timer);
    }
  }, [googleTestState]);
  
  const isValid = schema.validationStatus === 'valid';

  return (
    <div className={`card premium-hover ${isValid ? '' : 'border-red-300 dark:border-red-700/50'} fade-in-premium`}>
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-start gap-4">
            <div>
                <h3 className="text-heading text-slate-900 dark:text-text-primary">{schema.schemaType}</h3>
                <p className="text-body text-slate-600 dark:text-text-secondary mt-2">{schema.description}</p>
            </div>
            {isValid ? (
                <div className="flex-shrink-0 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-3 py-1.5 rounded-full font-medium shadow-premium">
                    <CheckIcon className="w-4 h-4" />
                    <span>Valid</span>
                </div>
            ) : (
                <div className="flex-shrink-0 flex items-center gap-2 text-sm text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-3 py-1.5 rounded-full font-medium shadow-premium">
                    <ErrorIcon className="w-4 h-4" />
                    <span>Invalid</span>
                </div>
            )}
        </div>
        {!isValid && schema.validationError && (
             <div className="mt-4 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded-md text-sm">
                <p><strong className="font-semibold">Validation Error:</strong> {schema.validationError}</p>
            </div>
        )}
      </div>
      <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <JsonSyntaxHighlighter jsonString={schema.jsonLd} />
      </div>
       <div className="bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-text-secondary flex-grow">
             Paste this into the <code className="bg-slate-200 dark:bg-slate-900/50 px-1 py-0.5 rounded">&lt;head&gt;</code> of your page's HTML.
          </p>
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto flex-shrink-0">
            {isValid && (
              <button
                onClick={handleTestWithGoogle}
                className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
                aria-label="Test schema with Google's Rich Results Test"
              >
                {googleTestState === 'copied_and_opened' ? (
                  <>
                    <CheckIcon className="w-4 h-4 text-green-500 dark:text-green-400" />
                    <span>Copied! Paste to test.</span>
                  </>
                ) : (
                  <>
                    <ExternalLinkIcon className="w-4 h-4" />
                    <span>Test with Google</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleCopy}
              className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
              aria-label="Copy schema to clipboard"
            >
              {isCopied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-green-500 dark:text-green-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <ClipboardIcon className="w-4 h-4" />
                  <span>Copy Script Tag</span>
                </>
              )}
            </button>
          </div>
       </div>
    </div>
  );
};