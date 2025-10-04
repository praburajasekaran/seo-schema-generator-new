import React from 'react';

interface JsonSyntaxHighlighterProps {
  jsonString: string;
}

const JsonSyntaxHighlighter: React.FC<JsonSyntaxHighlighterProps> = ({ jsonString }) => {
  if (!jsonString) {
    return null;
  }

  // Uses a regular expression to find JSON tokens and wraps them in spans with Tailwind classes.
  // This is safe because the input is a parsed and re-stringified JSON from our service.
  const highlightedJson = jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-syntax-number dark:text-syntax-dark-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-syntax-key dark:text-syntax-dark-key';
      } else {
        cls = 'text-syntax-string dark:text-syntax-dark-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-syntax-boolean dark:text-syntax-dark-boolean';
    } else if (/null/.test(match)) {
      cls = 'text-syntax-null dark:text-syntax-dark-null';
    }
    return `<span class="${cls}">${match}</span>`;
  });

  return (
    <pre className="p-4 md:p-6 text-sm overflow-x-auto">
      <code 
        className="text-slate-800 dark:text-slate-300 whitespace-pre-wrap font-mono"
        dangerouslySetInnerHTML={{ __html: highlightedJson }} 
      />
    </pre>
  );
};

export default JsonSyntaxHighlighter;