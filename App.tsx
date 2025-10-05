import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { analyzeUrlForSchemas, scrapePageContent } from './services/geminiService';
import type { RecommendedSchema, WebsiteProfile, WebsiteInfo, BreadcrumbItem } from './types';
import URLInputForm from './components/URLInputForm';
import SettingsForm from './components/SettingsForm';
import { SchemaCard } from './components/SchemaCard';
import LoadingSpinner from './components/LoadingSpinner';
import { ErrorIcon } from './components/icons/ErrorIcon';
import { ClipboardIcon } from './components/icons/ClipboardIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { SunIcon } from './components/icons/SunIcon';
import { MoonIcon } from './components/icons/MoonIcon';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [schemas, setSchemas] = useState<RecommendedSchema[] | null>(null);
  const [essentialSchemas, setEssentialSchemas] = useState<RecommendedSchema[] | null>(null);
  const [breadcrumbSchema, setBreadcrumbSchema] = useState<RecommendedSchema | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState<string>('');
  const [analyzedPageTitle, setAnalyzedPageTitle] = useState<string>('');
  const [isAllCopied, setIsAllCopied] = useState<boolean>(false);
  
  const [profiles, setProfiles] = useState<WebsiteProfile[]>(() => {
    try {
      const savedProfiles = localStorage.getItem('websiteProfiles');
      if (savedProfiles) {
        return JSON.parse(savedProfiles);
      }
      // Migration for old single websiteInfo
      const oldInfo = localStorage.getItem('websiteInfo');
      if (oldInfo) {
        const parsedOldInfo: WebsiteInfo = JSON.parse(oldInfo);
        if (parsedOldInfo.companyName || parsedOldInfo.founderName || parsedOldInfo.companyLogoUrl) {
          const newProfile: WebsiteProfile = {
            id: crypto.randomUUID(),
            profileName: parsedOldInfo.companyName || 'Default Profile',
            companyName: parsedOldInfo.companyName,
            founderName: parsedOldInfo.founderName,
            companyLogoUrl: parsedOldInfo.companyLogoUrl,
          };
          // Set new storage items
          localStorage.setItem('websiteProfiles', JSON.stringify([newProfile]));
          localStorage.setItem('selectedProfileId', newProfile.id);
          localStorage.removeItem('websiteInfo'); // Clean up old item
          return [newProfile];
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to load profiles from localStorage', error);
      return [];
    }
  });

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => {
    return localStorage.getItem('selectedProfileId');
  });

  const selectedProfile = useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId) ?? null;
  }, [profiles, selectedProfileId]);

  // Effect to ensure selected profile ID is valid
  useEffect(() => {
    const profileExists = profiles.some(p => p.id === selectedProfileId);
    if (selectedProfileId && !profileExists) {
      // If the selected profile was deleted, select the first one or null
      const firstProfileId = profiles.length > 0 ? profiles[0].id : null;
      setSelectedProfileId(firstProfileId);
    } else if (!selectedProfileId && profiles.length > 0) {
      // If nothing is selected but profiles exist, select the first one.
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);
  
  // Effect to persist profiles and selected ID to localStorage
  useEffect(() => {
    localStorage.setItem('websiteProfiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (selectedProfileId) {
      localStorage.setItem('selectedProfileId', selectedProfileId);
    } else {
      localStorage.removeItem('selectedProfileId');
    }
  }, [selectedProfileId]);

  const handleProfileSave = (profileData: Omit<WebsiteProfile, 'id'> & { id?: string }) => {
    console.log('handleProfileSave called with:', profileData);
    if (profileData.id) {
      // Update existing profile
      console.log('Updating existing profile:', profileData.id);
      setProfiles(currentProfiles =>
        currentProfiles.map(p => (p.id === profileData.id ? { ...p, ...profileData, id: p.id } : p))
      );
    } else {
      // Add new profile
      console.log('Creating new profile');
      const newProfile: WebsiteProfile = {
        profileName: profileData.profileName,
        companyName: profileData.companyName || '',
        founderName: profileData.founderName || '',
        companyLogoUrl: profileData.companyLogoUrl || '',
        id: crypto.randomUUID(),
      };
      console.log('New profile created:', newProfile);
      setProfiles(currentProfiles => [...currentProfiles, newProfile]);
      setSelectedProfileId(newProfile.id);
    }
  };

  const handleProfileDelete = (id: string) => {
    const remainingProfiles = profiles.filter(p => p.id !== id);
    setProfiles(remainingProfiles);
    if (selectedProfileId === id) {
        setSelectedProfileId(remainingProfiles.length > 0 ? remainingProfiles[0].id : null);
    }
  };

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && localStorage.theme) {
      return localStorage.theme as Theme;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const generateEssentialSchemas = (profile: WebsiteProfile, url: string): RecommendedSchema[] => {
    try {
        const urlObject = new URL(url);
        const rootUrl = `${urlObject.protocol}//${urlObject.hostname}`;
        const generatedSchemas: RecommendedSchema[] = [];

        // 1. Organization Schema
        const organizationSchema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": profile.companyName,
            "url": rootUrl,
            "logo": profile.companyLogoUrl,
        };
        generatedSchemas.push({
            schemaType: "Organization",
            description: "A foundational schema representing your organization. This should be placed on your homepage.",
            jsonLd: JSON.stringify(organizationSchema, null, 2),
            validationStatus: 'valid'
        });

        // 2. WebSite Schema with Sitelinks Search Box
        const websiteSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": profile.companyName,
            "url": rootUrl,
            "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `${rootUrl}/search?q={search_term_string}`
                },
                "query-input": "required name=search_term_string"
            }
        };
        generatedSchemas.push({
            schemaType: "WebSite",
            description: "Represents your website and enables a Sitelinks Search Box in search results. Adjust the 'urlTemplate' if your site's search URL is different.",
            jsonLd: JSON.stringify(websiteSchema, null, 2),
            validationStatus: 'valid'
        });

        return generatedSchemas;
    } catch (e) {
        console.error("Could not generate essential schemas:", e);
        return [];
    }
  }

  const generateBreadcrumbSchema = (items: BreadcrumbItem[]): RecommendedSchema => {
    const itemListElement = items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }));

    const breadcrumbJson = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": itemListElement
    };

    return {
      schemaType: "BreadcrumbList",
      description: "Generated from the breadcrumb navigation found on the page. This helps search engines understand the page's position in the site hierarchy.",
      jsonLd: JSON.stringify(breadcrumbJson, null, 2),
      validationStatus: 'valid'
    };
  };

  const handleAnalyze = useCallback(async (analysisUrl: string) => {
    if (!analysisUrl) {
      setError('Please enter a valid URL.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSchemas(null);
    setEssentialSchemas(null);
    setBreadcrumbSchema(null);
    setAnalyzedUrl(analysisUrl);
    setAnalyzedPageTitle('');
    
    const websiteInfoForApi: WebsiteInfo = selectedProfile ?? { companyName: '', founderName: '', companyLogoUrl: '' };

    try {
      if (selectedProfile && selectedProfile.companyName) {
        const essentials = generateEssentialSchemas(selectedProfile, analysisUrl);
        setEssentialSchemas(essentials);
      }
      
      const { pageText, existingSchemaText, breadcrumbs, pageTitle } = await scrapePageContent(analysisUrl);
      setAnalyzedPageTitle(pageTitle);
      
      if (breadcrumbs.length > 0) {
        setBreadcrumbSchema(generateBreadcrumbSchema(breadcrumbs));
      }

      if (!pageText) {
        setSchemas([]); // Set to empty array to show "no results" message if needed
      } else {
        const result = await analyzeUrlForSchemas(analysisUrl, websiteInfoForApi, pageText, existingSchemaText);
        setSchemas(result);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred. Please check the console for details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedProfile]);

  const handleCopyAll = useCallback(() => {
    if (!schemas) return;

    const validSchemas = schemas.filter(s => s.validationStatus === 'valid');
    if (validSchemas.length === 0) return;

    const allJsonObjects = validSchemas
      .map(s => {
        try {
          return JSON.parse(s.jsonLd);
        } catch (e) {
          console.error("This should not happen for a valid schema:", s);
          return null;
        }
      })
      .filter(Boolean);

    if (allJsonObjects.length === 0) return;

    const combinedJsonLd = JSON.stringify(allJsonObjects, null, 2);
    const scriptContent = `<script type="application/ld+json">${combinedJsonLd}</script>`;

    navigator.clipboard.writeText(scriptContent);
    setIsAllCopied(true);
  }, [schemas]);

  useEffect(() => {
    if (isAllCopied) {
      const timer = setTimeout(() => setIsAllCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAllCopied]);
  
  const validSchemas = schemas?.filter(s => s.validationStatus === 'valid') ?? [];
  const hasResults = (schemas && schemas.length > 0) || (essentialSchemas && essentialSchemas.length > 0) || !!breadcrumbSchema;

  return (
    <div className="min-h-screen text-slate-800 dark:text-text-primary font-sans bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900">
      <header className="container mx-auto px-4 pt-6 flex justify-end">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full text-slate-500 dark:text-text-secondary hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-sm transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-accent shadow-premium"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
        </button>
      </header>
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-16 fade-in-premium">
            <h1 className="text-hero mb-6">
              SEO Schema Generator
            </h1>
          <p className="text-body text-slate-600 dark:text-text-secondary max-w-2xl mx-auto">
            Paste a URL. We'll analyze the page and generate relevant JSON-LD schemas for you.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <SettingsForm
            profiles={profiles}
            selectedProfile={selectedProfile}
            onProfileSelect={setSelectedProfileId}
            onProfileSave={handleProfileSave}
            onProfileDelete={handleProfileDelete}
          />
          <URLInputForm
            url={url}
            setUrl={setUrl}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
          />

          {error && (
            <div className="mt-8 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg flex items-center gap-3">
              <ErrorIcon className="w-6 h-6" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && <LoadingSpinner />}

          {!isLoading && analyzedUrl && (
            <div className="mt-16 border-t border-slate-200/50 dark:border-base-300/50 pt-12">
              {hasResults ? (
                 <div className="space-y-16">
                    {essentialSchemas && essentialSchemas.length > 0 && (
                      <div className="fade-in-premium">
                        <h2 className="text-heading text-center sm:text-left text-slate-900 dark:text-text-primary mb-8">
                          Essential Site-Wide Schemas
                        </h2>
                        <div className="space-y-8">
                          {essentialSchemas.map((schema, index) => (
                            <SchemaCard key={`essential-${index}`} schema={schema} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {breadcrumbSchema && (
                       <div className="fade-in-premium">
                        <h2 className="text-heading text-center sm:text-left text-slate-900 dark:text-text-primary mb-8">
                          Structural Schemas
                        </h2>
                        <div className="space-y-8">
                           <SchemaCard schema={breadcrumbSchema} />
                        </div>
                      </div>
                    )}

                    {schemas && schemas.length > 0 && (
                      <div>
                        <div className="mb-6">
                          <div className="text-center sm:text-left">
                             <h2 className="text-2xl font-semibold font-sans text-slate-900 dark:text-text-primary">
                              Content-Based Schemas for
                            </h2>
                            <p 
                              className="text-brand-primary dark:text-brand-accent font-normal text-xl mt-1"
                              title={analyzedUrl}
                            >
                              {analyzedPageTitle || analyzedUrl}
                            </p>
                          </div>
                        </div>
                        {validSchemas.length > 1 && (
                          <div className="mb-10 flex justify-center sm:justify-start">
                            <button
                              onClick={handleCopyAll}
                              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-primary hover:bg-brand-secondary text-white rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                              aria-label="Copy all valid schemas to clipboard"
                            >
                              {isAllCopied ? (
                                <>
                                  <CheckIcon className="w-4 h-4" />
                                  <span>All Copied!</span>
                                </>
                              ) : (
                                <>
                                  <ClipboardIcon className="w-4 h-4" />
                                  <span>Copy All Valid Schemas</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                        <div className="space-y-8">
                          {schemas.map((schema, index) => (
                            <SchemaCard key={index} schema={schema} />
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
              ) : (
                <div className="text-center text-slate-500 dark:text-text-secondary py-12 fade-in-premium">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Schemas Found</h3>
                    <p className="text-body">We couldn't find any schemas to recommend for that URL.</p>
                    <p className="text-caption mt-2">This can happen if the page content was inaccessible or did not match any common schema types.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <footer className="text-center py-8 text-caption border-t border-slate-200/50 dark:border-slate-700/50">
        <p>A simple tool by <a href="https://paretoid.com/" target="_blank" rel="noopener noreferrer" className="text-gradient hover:underline transition-all duration-300">Paretoid Marketing LLP</a>. We prefer less software.</p>
      </footer>
    </div>
  );
};

export default App;