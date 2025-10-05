import type { RecommendedSchema, WebsiteInfo, BreadcrumbItem } from "../types";
import { generateSchemasWithOpenRouter, validateSchema } from "./openRouterService";
import { 
  generateMultipleSchemasFromTemplates, 
  extractContentForTemplate 
} from "./schemaTemplateService";
import { scrapePageContent } from "./geminiService";

// Provider configuration
export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  retries: number;
}

export interface SchemaGenerationConfig {
  providers: {
    openai: ProviderConfig;
    gemini: ProviderConfig;
    templates: ProviderConfig;
  };
  maxSchemas: number;
  enableValidation: boolean;
  enableFallback: boolean;
}

// Default configuration - Gemini Flash Only (Maximum Speed)
const DEFAULT_CONFIG: SchemaGenerationConfig = {
  providers: {
    openai: {
      name: 'Gemini Flash Only (Fastest)',
      enabled: !!process.env.OPENROUTER_API_KEY,
      priority: 1,
      timeout: 10000, // Reduced to 10s for maximum speed
      retries: 1
    },
    gemini: {
      name: 'Legacy Gemini Service',
      enabled: !!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY,
      priority: 2,
      timeout: 10000,
      retries: 1
    },
    templates: {
      name: 'Template-based Generation',
      enabled: false, // Disabled for speed - AI is faster than templates
      priority: 3,
      timeout: 5000,
      retries: 1
    }
  },
  maxSchemas: 2, // Keep at 2 for faster processing
  enableValidation: false, // Disabled for maximum speed
  enableFallback: true
};

// Simple in-memory cache for schema results
interface CacheEntry {
  schemas: RecommendedSchema[];
  provider: string;
  processingTime: number;
  validationResults: any[];
  timestamp: number;
}

// Main multi-provider schema generation service
export class MultiProviderSchemaService {
  private config: SchemaGenerationConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<SchemaGenerationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Generate cache key from URL and content hash
  private generateCacheKey(url: string, pageText: string, websiteInfo: WebsiteInfo): string {
    // Use encodeURIComponent to safely encode Unicode characters
    const contentString = JSON.stringify({ url, pageText: pageText.substring(0, 1000), websiteInfo });
    const contentHash = btoa(encodeURIComponent(contentString));
    return `schema_${contentHash}`;
  }

  // Check cache for existing results
  private getCachedResult(cacheKey: string): CacheEntry | null {
    const entry = this.cache.get(cacheKey);
    if (entry && (Date.now() - entry.timestamp) < this.CACHE_TTL) {
      console.log('🎯 Cache hit! Returning cached schema results');
      return entry;
    }
    if (entry) {
      this.cache.delete(cacheKey); // Remove expired entry
    }
    return null;
  }

  // Store result in cache
  private setCachedResult(cacheKey: string, result: Omit<CacheEntry, 'timestamp'>): void {
    this.cache.set(cacheKey, {
      ...result,
      timestamp: Date.now()
    });
  }

  // Main entry point for schema generation
  async generateSchemas(
    url: string,
    websiteInfo: WebsiteInfo,
    pageText?: string,
    existingSchemaText?: string,
    breadcrumbs?: BreadcrumbItem[],
    pageTitle?: string
  ): Promise<{
    schemas: RecommendedSchema[];
    provider: string;
    processingTime: number;
    validationResults: any[];
  }> {
    const startTime = Date.now();
    console.log('Starting multi-provider schema generation');

    // If pageText is not provided, scrape it
    let scrapedData;
    if (!pageText) {
      console.log('Scraping page content...');
      scrapedData = await scrapePageContent(url);
      pageText = scrapedData.pageText;
      existingSchemaText = scrapedData.existingSchemaText;
      breadcrumbs = scrapedData.breadcrumbs;
      pageTitle = scrapedData.pageTitle;
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(url, pageText, websiteInfo);
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return {
        schemas: cachedResult.schemas,
        provider: cachedResult.provider,
        processingTime: Date.now() - startTime,
        validationResults: cachedResult.validationResults
      };
    }

    // Get enabled providers sorted by priority
    const enabledProviders = Object.entries(this.config.providers)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority);

    let lastError: Error | null = null;
    let schemas: RecommendedSchema[] = [];
    let usedProvider = '';

    // Try each provider in priority order
    for (const [providerKey, providerConfig] of enabledProviders) {
      try {
        console.log(`Attempting schema generation with ${providerConfig.name}...`);
        
        const providerSchemas = await this.generateWithProvider(
          providerKey,
          url,
          websiteInfo,
          pageText!,
          existingSchemaText || '',
          providerConfig
        );

        if (providerSchemas && providerSchemas.length > 0) {
          schemas = providerSchemas;
          usedProvider = providerConfig.name;
          console.log(`Successfully generated ${schemas.length} schemas with ${providerConfig.name}`);
          break;
        }

      } catch (error) {
        console.warn(`${providerConfig.name} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Continue to next provider
        continue;
      }
    }

    // If all providers failed and fallback is enabled
    if (schemas.length === 0 && this.config.enableFallback) {
      console.log('All providers failed, attempting fallback generation...');
      try {
        schemas = await this.generateFallbackSchemas(pageText!, websiteInfo);
        usedProvider = 'Fallback';
      } catch (error) {
        console.error('Fallback generation failed:', error);
        throw new Error(`All schema generation methods failed. Last error: ${lastError?.message || 'Unknown error'}`);
      }
    }

    // Validate schemas if enabled
    let validationResults: any[] = [];
    if (this.config.enableValidation && schemas.length > 0) {
      validationResults = schemas.map(schema => {
        try {
          const parsedSchema = JSON.parse(schema.jsonLd);
          return validateSchema(parsedSchema, schema.schemaType);
        } catch (error) {
          return {
            isValid: false,
            errors: ['Invalid JSON format'],
            warnings: [],
            suggestions: []
          };
        }
      });
    }

    const processingTime = Date.now() - startTime;
    console.log(`Schema generation completed in ${processingTime}ms using ${usedProvider}`);

    const result = {
      schemas: schemas.slice(0, this.config.maxSchemas),
      provider: usedProvider,
      processingTime,
      validationResults
    };

    // Cache the result
    this.setCachedResult(cacheKey, result);

    return result;
  }

  // Generate schemas with a specific provider
  private async generateWithProvider(
    providerKey: string,
    url: string,
    websiteInfo: WebsiteInfo,
    pageText: string,
    existingSchemaText: string,
    config: ProviderConfig
  ): Promise<RecommendedSchema[]> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Provider timeout')), config.timeout);
    });

    const providerPromise = this.executeProvider(providerKey, url, websiteInfo, pageText, existingSchemaText);
    
    return Promise.race([providerPromise, timeoutPromise]);
  }

  // Execute the actual provider logic
  private async executeProvider(
    providerKey: string,
    url: string,
    websiteInfo: WebsiteInfo,
    pageText: string,
    existingSchemaText: string
  ): Promise<RecommendedSchema[]> {
    switch (providerKey) {
      case 'openai':
      case 'gemini':
        // Using OpenRouter with Quality-First Stack (GPT-4o-mini → Gemini Flash → Mistral Small)
        return await generateSchemasWithOpenRouter(url, websiteInfo, pageText, existingSchemaText);
      
      case 'templates':
        const content = extractContentForTemplate(pageText, url, existingSchemaText);
        const detectedTypes = this.detectSchemaTypes(pageText, url);
        return await generateMultipleSchemasFromTemplates(detectedTypes, content, websiteInfo);
      
      default:
        throw new Error(`Unknown provider: ${providerKey}`);
    }
  }

  // Detect schema types from content (simplified version)
  private detectSchemaTypes(pageText: string, url: string): string[] {
    const text = pageText.toLowerCase();
    const urlLower = url.toLowerCase();
    const detectedTypes: string[] = [];
    
    const patterns = {
      testimonial: ['testimonial', 'client says', 'customer says', 'client feedback'],
      article: ['article', 'blog', 'post', 'news', 'story'],
      product: ['buy', 'price', 'product', 'shop', 'cart', '$'],
      faq: ['faq', 'question', 'answer', 'how to', 'what is'],
      howto: ['step', 'instructions', 'tutorial', 'guide'],
      localBusiness: ['address', 'phone', 'location', 'hours', 'contact'],
      event: ['event', 'date', 'time', 'venue', 'ticket'],
      review: ['review', 'rating', 'stars', 'opinion']
    };
    
    for (const [category, keywords] of Object.entries(patterns)) {
      const hasKeywords = keywords.some(keyword => 
        text.includes(keyword) || urlLower.includes(keyword)
      );
      
      if (hasKeywords) {
        switch (category) {
          case 'testimonial':
            detectedTypes.push('Testimonial');
            break;
          case 'article':
            detectedTypes.push('BlogPosting');
            break;
          case 'product':
            detectedTypes.push('Product');
            break;
          case 'faq':
            detectedTypes.push('FAQPage');
            break;
          case 'howto':
            detectedTypes.push('HowTo');
            break;
          case 'localBusiness':
            detectedTypes.push('LocalBusiness');
            break;
          case 'event':
            detectedTypes.push('Event');
            break;
          case 'review':
            detectedTypes.push('Review');
            break;
        }
      }
    }
    
    if (detectedTypes.length === 0 && text.length > 200) {
      detectedTypes.push('BlogPosting');
    }
    
    return [...new Set(detectedTypes)];
  }

  // Generate fallback schemas when all providers fail
  private async generateFallbackSchemas(pageText: string, websiteInfo: WebsiteInfo): Promise<RecommendedSchema[]> {
    const lines = pageText.split('\n').filter(line => line.trim().length > 0);
    const title = lines[0]?.trim() || 'Page Content';
    const description = lines.slice(1, 3).join(' ').substring(0, 200).trim() || 'Content from the page';
    
    const fallbackSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "author": websiteInfo.founderName ? {
        "@type": "Person",
        "name": websiteInfo.founderName
      } : undefined,
      "publisher": websiteInfo.companyName ? {
        "@type": "Organization",
        "name": websiteInfo.companyName,
        "logo": websiteInfo.companyLogoUrl ? {
          "@type": "ImageObject",
          "url": websiteInfo.companyLogoUrl
        } : undefined
      } : undefined,
      "datePublished": new Date().toISOString()
    };

    // Remove undefined properties
    Object.keys(fallbackSchema).forEach(key => {
      if (fallbackSchema[key as keyof typeof fallbackSchema] === undefined) {
        delete fallbackSchema[key as keyof typeof fallbackSchema];
      }
    });

    return [{
      schemaType: 'BlogPosting',
      description: 'Fallback schema generated when all providers failed',
      jsonLd: JSON.stringify(fallbackSchema, null, 2),
      validationStatus: 'valid'
    }];
  }

  // Update configuration
  updateConfig(newConfig: Partial<SchemaGenerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): SchemaGenerationConfig {
    return { ...this.config };
  }

  // Test provider availability
  async testProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [providerKey, config] of Object.entries(this.config.providers)) {
      if (!config.enabled) {
        results[providerKey] = false;
        continue;
      }

      try {
        // Simple test with minimal content
        const testSchemas = await this.executeProvider(
          providerKey,
          'https://example.com',
          { companyName: 'Test Company', founderName: '', companyLogoUrl: '' },
          'Test content for provider testing',
          ''
        );
        results[providerKey] = testSchemas.length > 0;
      } catch (error) {
        console.warn(`Provider ${providerKey} test failed:`, error);
        results[providerKey] = false;
      }
    }

    return results;
  }
}

// Export a default instance
export const schemaService = new MultiProviderSchemaService();

// Export the main function for backward compatibility
export const analyzeUrlForSchemas = async (
  url: string,
  websiteInfo: WebsiteInfo,
  pageText?: string,
  existingSchemaText?: string
): Promise<RecommendedSchema[]> => {
  const result = await schemaService.generateSchemas(url, websiteInfo, pageText, existingSchemaText);
  return result.schemas;
};
