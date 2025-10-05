import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { analyzeUrlForSchemas, scrapePageContent } from './services/geminiService';
import { schemaService, type SchemaGenerationConfig } from './services/multiProviderSchemaService';
import type { RecommendedSchema, WebsiteProfile, WebsiteInfo, BreadcrumbItem } from './types';
import URLInputForm from './components/URLInputForm';
import SettingsForm from './components/SettingsForm';
import { SchemaCard } from './components/SchemaCard';
import LoadingSpinner from './components/LoadingSpinner';
import { ManualContentInput } from './components/ManualContentInput';
import { ErrorIcon } from './components/icons/ErrorIcon';
import { ClipboardIcon } from './components/icons/ClipboardIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { Info, Database, CheckCircle, Zap, Search, FileText } from 'lucide-react';
// Import the image as a static asset
const pallavaImage = '/pallava-1.png';

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
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [browserAutomationAvailable, setBrowserAutomationAvailable] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [generationProvider, setGenerationProvider] = useState<string>('');
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  
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
            isLightLogo: false,
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
    }
    // Removed the auto-selection of first profile when selectedProfileId is null
    // This allows users to explicitly choose "Create New Profile"
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
    if (profileData.id) {
      // Update existing profile
      setProfiles(currentProfiles =>
        currentProfiles.map(p => (p.id === profileData.id ? { ...p, ...profileData, id: p.id } : p))
      );
    } else {
      // Add new profile
      const newProfile: WebsiteProfile = {
        profileName: profileData.profileName,
        companyName: profileData.companyName || '',
        founderName: profileData.founderName || '',
        companyLogoUrl: profileData.companyLogoUrl || '',
        isLightLogo: profileData.isLightLogo || false,
        id: crypto.randomUUID(),
      };
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

  const handleProfileSelect = (id: string | null) => {
    setSelectedProfileId(id);
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
    setLoadingStage('Initializing...');
    
    const websiteInfoForApi: WebsiteInfo = selectedProfile ?? { companyName: '', founderName: '', companyLogoUrl: '' };

    try {
      // Start essential schemas generation immediately (synchronous)
      if (selectedProfile && selectedProfile.companyName) {
        setLoadingStage('Generating essential schemas...');
        const essentials = generateEssentialSchemas(selectedProfile, analysisUrl);
        setEssentialSchemas(essentials);
      }
      
      // Start content scraping
      setLoadingStage('Fetching page content...');
      const contentPromise = scrapePageContent(analysisUrl);
      
      // Wait for content scraping to complete
      const { pageText, existingSchemaText, breadcrumbs, pageTitle } = await contentPromise;
      setAnalyzedPageTitle(pageTitle);
      
      // Generate breadcrumb schema immediately if available
      if (breadcrumbs.length > 0) {
        setBreadcrumbSchema(generateBreadcrumbSchema(breadcrumbs));
      }

      if (!pageText) {
        setSchemas([]); // Set to empty array to show "no results" message if needed
      } else {
        setLoadingStage('Analyzing content and generating schemas...');
        
        // Start schema generation with optimized timeout
        const schemaPromise = schemaService.generateSchemas(
          analysisUrl, 
          websiteInfoForApi, 
          pageText, 
          existingSchemaText
        );
        
        // Add timeout to schema generation (20 seconds max for faster feedback)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Schema generation timeout')), 20000)
        );
        
        const result = await Promise.race([schemaPromise, timeoutPromise]) as any;
        setSchemas(result.schemas);
        setGenerationProvider(result.provider);
        setProcessingTime(result.processingTime);
        setValidationResults(result.validationResults);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        // Check if it's a Cloudflare or similar blocking error
        if (err.message.includes('403') || err.message.includes('Forbidden') || 
            err.message.includes('blocking') || err.message.includes('firewall') ||
            err.message.includes('security') || err.message.includes('Cloudflare')) {
          setError('This website is protected by Cloudflare or similar security measures. Please use the "Manual Content Input" option below.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unknown error occurred. Please check the console for details.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  }, [selectedProfile]);

  const handleManualContentSubmit = useCallback(async (content: string, pageTitle: string) => {
    setIsLoading(true);
    setError(null);
    setSchemas(null);
    setBreadcrumbSchema(null);
    setAnalyzedPageTitle(pageTitle);
    setShowManualInput(false);
    
    const websiteInfoForApi: WebsiteInfo = selectedProfile ?? { companyName: '', founderName: '', companyLogoUrl: '' };

    try {
      if (selectedProfile && selectedProfile.companyName) {
        const essentials = generateEssentialSchemas(selectedProfile, analyzedUrl);
        setEssentialSchemas(essentials);
      }

      const result = await schemaService.generateSchemas(analyzedUrl, websiteInfoForApi, content, '');
      setSchemas(result.schemas);
      setGenerationProvider(result.provider);
      setProcessingTime(result.processingTime);
      setValidationResults(result.validationResults);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while processing the manual content.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedProfile, analyzedUrl]);

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

  // Check browser automation availability on mount
  useEffect(() => {
    const checkBrowserAvailability = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health');
        setBrowserAutomationAvailable(response.ok);
      } catch (error) {
        console.warn('Browser automation not available:', error);
        setBrowserAutomationAvailable(false);
      }
    };

    checkBrowserAvailability();
  }, []);
  
  const validSchemas = schemas?.filter(s => s.validationStatus === 'valid') ?? [];
  const hasResults = (schemas && schemas.length > 0) || (essentialSchemas && essentialSchemas.length > 0) || !!breadcrumbSchema;

  return (
    <div className="min-h-screen text-slate-800 font-sans bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <main className="container mx-auto px-4 sm:px-6 pt-6 pb-12 sm:pt-8 sm:pb-16 md:pt-16 md:pb-24">
        {/* Hero Banner */}
        <div className="relative mb-8 sm:mb-12 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
          <img 
            src={pallavaImage} 
            alt="Ancient temples and monuments in golden light" 
            className="w-full h-64 sm:h-72 md:h-96 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 text-center">
            <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-full text-sm sm:text-base font-medium text-white shadow-lg mb-4 sm:mb-6">
              <Info className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Free • No signup required</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg leading-tight">
              SEO Schema Generator
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-white/95 drop-shadow-md max-w-3xl mx-auto leading-relaxed px-2">
              Paste a URL. We'll analyze the page and generate relevant JSON-LD schemas for you.
            </p>
          </div>
        </div>


        {/* Features Section */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="text-center p-4 sm:p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">Smart Content Detection</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Automatically detects content types and generates relevant schemas</p>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">Validated Output</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">All schemas are validated and ready to implement</p>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-purple-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">Advanced Bypass</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {browserAutomationAvailable 
                  ? "Browser automation available for Cloudflare bypass" 
                  : "Multiple fallback methods for protected sites"
                }
              </p>
            </div>
          </div>

          {/* Example URLs */}
          <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-200/50">
            <h3 className="font-semibold text-slate-900 mb-3 sm:mb-4 text-center text-sm sm:text-base">Try these example URLs:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 sm:space-y-3">
                <button 
                  onClick={() => setUrl('https://shop.yuukke.com/products/millet-jaggery-cookies')}
                  className="w-full text-left p-3 sm:p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 text-xs sm:text-sm"
                >
                  <span className="font-medium text-slate-900 block mb-1">E-commerce Product</span>
                  <span className="text-slate-500 text-xs sm:text-sm break-all">shop.yuukke.com/products/millet-jaggery-cookies</span>
                </button>
                <button 
                  onClick={() => setUrl('https://liveright.in/2024/03/30/tips-to-regulate-healthy-vaginal-discharge/')}
                  className="w-full text-left p-3 sm:p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 text-xs sm:text-sm"
                >
                  <span className="font-medium text-slate-900 block mb-1">Blog Article</span>
                  <span className="text-slate-500 text-xs sm:text-sm break-all">liveright.in/.../tips-to-regulate-healthy-vaginal-discharge/</span>
                </button>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <button 
                  onClick={() => setUrl('https://www.radiancerealty.in/premium-2bhk-3bhk-4bhk-apartment-sale-madhavaram-chennai')}
                  className="w-full text-left p-3 sm:p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 text-xs sm:text-sm"
                >
                  <span className="font-medium text-slate-900 block mb-1">Property Listing</span>
                  <span className="text-slate-500 text-xs sm:text-sm break-all">radiancerealty.in/.../apartment-sale-madhavaram-chennai</span>
                </button>
                <button 
                  onClick={() => setUrl('https://annapoorna.com.my/indian-cuisine-and-recipes/curry-vegetable-recipe/')}
                  className="w-full text-left p-3 sm:p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 text-xs sm:text-sm"
                >
                  <span className="font-medium text-slate-900 block mb-1">Recipe Page</span>
                  <span className="text-slate-500 text-xs sm:text-sm break-all">annapoorna.com.my/.../curry-vegetable-recipe/</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {/* Main Action Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/50 shadow-lg p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
            <div className="space-y-6 sm:space-y-8">
              <SettingsForm
                profiles={profiles}
                selectedProfile={selectedProfile}
                onProfileSelect={handleProfileSelect}
                onProfileSave={handleProfileSave}
                onProfileDelete={handleProfileDelete}
              />
              
              <div className="border-t border-slate-200/50 pt-6 sm:pt-8">
                <URLInputForm
                  url={url}
                  setUrl={setUrl}
                  onAnalyze={handleAnalyze}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <ErrorIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm sm:text-base break-words">{error}</span>
                {error.includes('Cloudflare') && (
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="mt-3 sm:mt-0 sm:ml-4 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors w-full sm:w-auto justify-center"
                  >
                    <FileText className="w-4 h-4" />
                    Manual Content Input
                  </button>
                )}
              </div>
            </div>
          )}

          {isLoading && <LoadingSpinner loadingStage={loadingStage} />}

          {!isLoading && analyzedUrl && (
            <div className="mt-8 sm:mt-12 border-t border-slate-200/50 pt-8 sm:pt-12">
              {hasResults ? (
                 <div className="space-y-12 sm:space-y-16">
                    {essentialSchemas && essentialSchemas.length > 0 && (
                      <div className="fade-in-premium">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-slate-900 mb-6 sm:mb-8">
                          Essential Site-Wide Schemas
                        </h2>
                        <div className="space-y-6 sm:space-y-8">
                          {essentialSchemas.map((schema, index) => (
                            <SchemaCard key={`essential-${index}`} schema={schema} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {breadcrumbSchema && (
                       <div className="fade-in-premium">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-slate-900 mb-6 sm:mb-8">
                          Structural Schemas
                        </h2>
                        <div className="space-y-6 sm:space-y-8">
                           <SchemaCard schema={breadcrumbSchema} />
                        </div>
                      </div>
                    )}

                    {schemas && schemas.length > 0 && (
                      <div>
                        <div className="mb-6 sm:mb-8">
                          <div className="text-center sm:text-left">
                             <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-sans text-slate-900 mb-3 sm:mb-4">
                              Content-Based Schemas
                            </h2>
                            
                            <p 
                              className="text-blue-600 dark:text-blue-400 font-medium text-base sm:text-lg lg:text-xl break-words"
                              title={analyzedUrl}
                            >
                              {analyzedPageTitle || analyzedUrl}
                            </p>
                          </div>
                        </div>
                        {validSchemas.length > 1 && (
                          <div className="mb-6 sm:mb-8 flex justify-center sm:justify-start">
                            <button
                              onClick={handleCopyAll}
                              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
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
                        <div className="space-y-4 sm:space-y-6">
                          {schemas.map((schema, index) => (
                            <SchemaCard key={index} schema={schema} />
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
              ) : (
                <div className="text-center text-slate-500 py-8 sm:py-12 fade-in-premium">
                  <div className="max-w-md mx-auto px-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                      <Search className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">No Schemas Found</h3>
                    <p className="text-sm sm:text-base text-slate-600 mb-2">We couldn't find any schemas to recommend for that URL.</p>
                    <p className="text-xs sm:text-sm text-slate-500">This can happen if the page content was inaccessible or did not match any common schema types.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <footer className="text-center py-6 sm:py-8 text-xs sm:text-sm text-slate-500 border-t border-slate-200/50 px-4">
        <p>A simple tool by <a href="https://paretoid.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300">Paretoid Marketing LLP</a>. We prefer less software.</p>
      </footer>

      {showManualInput && (
        <ManualContentInput
          onContentSubmit={handleManualContentSubmit}
          onCancel={() => setShowManualInput(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default App;