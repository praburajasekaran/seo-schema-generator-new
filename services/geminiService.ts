import { GoogleGenAI, Type } from "@google/genai";
import type { RecommendedSchema, GeminiApiResponse, WebsiteInfo, BreadcrumbItem } from "../types";
import { 
  isRateLimited, 
  recordSuccessfulRequest, 
  recordRateLimit, 
  getRequestDelay, 
  isRateLimitResponse, 
  getRetryAfter 
} from "./rateLimiting";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    schemas: {
      type: Type.ARRAY,
      description: "An array of recommended SEO schemas based on the article's content.",
      items: {
        type: Type.OBJECT,
        properties: {
          schemaType: {
            type: Type.STRING,
            description: "The type of the schema, e.g., 'Article', 'FAQPage', 'HowTo'."
          },
          description: {
            type: Type.STRING,
            description: "A brief explanation of why this schema is recommended for the article."
          },
          jsonLd: {
            type: Type.STRING,
            description: "The complete, valid JSON-LD script as a string. This string should be parsable as JSON."
          }
        },
        required: ["schemaType", "description", "jsonLd"]
      }
    }
  },
  required: ["schemas"],
};

/**
 * Scrapes the text content, existing schemas, and breadcrumbs from a web page using a CORS proxy.
 * @param url The URL of the page to scrape.
 * @returns An object containing the cleaned page text, any existing schema text, and an array of breadcrumb items.
 */
export const scrapePageContent = async (url: string): Promise<{ pageText: string; existingSchemaText: string; breadcrumbs: BreadcrumbItem[]; pageTitle: string; }> => {
  console.log(`Starting content scraping for: ${url}`);
  
  // Check if we're rate limited for this URL
  if (isRateLimited(url)) {
    const delay = getRequestDelay(url);
    console.log(`Rate limited for ${url}. Waiting ${Math.round(delay/1000)}s before attempting...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Updated proxy services - using more reliable alternatives
  const proxyServices = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`
  ];

  // Rotate through realistic user agents to avoid detection
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  let lastError: Error | null = null;
  
  for (let i = 0; i < proxyServices.length; i++) {
    const proxyUrl = proxyServices[i];
    const userAgent = userAgents[i % userAgents.length];
    
    try {
      console.log(`Attempting to fetch via proxy ${i + 1}/${proxyServices.length}: ${proxyUrl.split('?')[0]}`);
      
      // Add adaptive delay between requests to avoid rate limiting
      if (i > 0) {
        const delay = getRequestDelay(url);
        console.log(`Waiting ${Math.round(delay/1000)}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Enhanced headers to mimic real browser behavior
      const headers: Record<string, string> = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': userAgent,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1',
        'Connection': 'keep-alive'
      };

      // Optimized retry logic - reduced to 2 attempts per proxy for faster failure
      let requestAttempts = 0;
      const maxRequestAttempts = 2;
      let response: Response | null = null;
      
      while (requestAttempts < maxRequestAttempts) {
        try {
          response = await fetch(proxyUrl, {
            method: 'GET',
            headers,
            // Optimized timeout - reduced to 8 seconds for faster failure
            signal: AbortSignal.timeout(8000), // Reduced to 8 seconds
            // Add referrer to make request look more legitimate
            referrer: 'https://www.google.com/',
            referrerPolicy: 'strict-origin-when-cross-origin'
          });
          break; // Success, exit retry loop
        } catch (requestError) {
          requestAttempts++;
          console.warn(`Request attempt ${requestAttempts}/${maxRequestAttempts} failed:`, requestError);
          
          if (requestAttempts < maxRequestAttempts) {
            // Wait before retrying (exponential backoff)
            const retryDelay = Math.min(1000 * Math.pow(2, requestAttempts - 1), 5000);
            console.log(`Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            throw requestError; // Re-throw if all attempts failed
          }
        }
      }
      
      if (!response) {
        throw new Error('All request attempts failed');
      }
      
      if (!response.ok) {
        // Check for rate limiting
        if (isRateLimitResponse(response)) {
          const retryAfter = getRetryAfter(response);
          recordRateLimit(url, retryAfter || undefined);
          throw new Error(`Rate limited by proxy service. Status: ${response.status} ${response.statusText}`);
        }
        throw new Error(`Proxy service returned status: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      
      if (!html || html.trim().length === 0) {
        throw new Error('Proxy service returned empty content');
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // 0. Extract Page Title for display
      const pageTitle = doc.querySelector('title')?.textContent?.trim() || url;

      // 1. Extract existing JSON-LD schemas to use as context
      const existingSchemaScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
      const existingSchemaText = existingSchemaScripts
        .map(script => {
          try {
            // Prettify the JSON to make it more readable for the AI
            const parsed = JSON.parse(script.textContent || '{}');
            return JSON.stringify(parsed, null, 2);
          } catch {
            return script.textContent || ''; // Fallback to raw text if not valid JSON
          }
        })
        .join('\n---\n');
        
      // 2. Extract breadcrumbs
      const breadcrumbs: BreadcrumbItem[] = [];
      const breadcrumbSelectors = [
          'nav[aria-label="breadcrumb"] ol li a',
          '.breadcrumb a',
          '.breadcrumbs a',
          '.crumbs a'
      ];
      let breadcrumbElements: Element[] = [];
      for(const selector of breadcrumbSelectors) {
          const elements = Array.from(doc.querySelectorAll(selector));
          if (elements.length > 0) {
              breadcrumbElements = elements;
              break;
          }
      }
      
      breadcrumbElements.forEach(el => {
          const anchor = el as HTMLAnchorElement;
          const name = anchor.textContent?.trim();
          const url = anchor.href;
          if (name && url) {
              breadcrumbs.push({ name, url });
          }
      });

      // 3. Intelligently clean the document for main content extraction (like a "Reader Mode")
      const selectorsToRemove = [
        'header', 'footer', 'nav', 'aside', 'form', 'script', 'style', 
        '[role="navigation"]', '[role="search"]', '[role="banner"]', '[role="contentinfo"]',
        'noscript', 'iframe', 'embed', 'object', 'video', 'audio',
        '.advertisement', '.ads', '.ad', '.sidebar', '.widget', '.social-share',
        '.comments', '.comment', '.related-posts', '.tags', '.categories'
      ];
      selectorsToRemove.forEach(selector => {
        doc.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      // 4. Remove image alt text and other metadata that can pollute content
      doc.querySelectorAll('img').forEach(img => {
        // Remove alt text that's just generic descriptions
        const alt = img.getAttribute('alt') || '';
        if (alt && (
          alt.toLowerCase().includes('image') || 
          alt.toLowerCase().includes('photo') || 
          alt.toLowerCase().includes('picture') ||
          alt.toLowerCase().includes('banner') ||
          alt.toLowerCase().includes('logo') ||
          alt.length < 3
        )) {
          img.removeAttribute('alt');
        }
      });
      
      // Remove elements that commonly contain metadata
      doc.querySelectorAll('[class*="meta"], [class*="metadata"], [class*="info"]').forEach(el => {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('image') || text.includes('photo') || text.includes('banner')) {
          el.remove();
        }
      });
      
      // 5. Extract the main text content
      const mainContentElement = doc.querySelector('main') || doc.querySelector('article') || doc.body;
      let pageText = mainContentElement.textContent || "";
      
      // 6. Advanced text cleaning
      // Remove quoted strings that are likely metadata (like "Image", "Annapoorna", etc.)
      pageText = pageText
        .replace(/"Image"\s+/g, '') // Remove "Image" followed by whitespace
        .replace(/"Annapoorna"\s+/g, '') // Remove "Annapoorna" followed by whitespace
        .replace(/"\w+"\s+(?=\w)/g, '') // Remove quoted single words followed by text
        .replace(/\s\s+/g, ' ') // Clean up excessive whitespace
        .replace(/^\s*"[^"]*"\s*/gm, '') // Remove lines that start with quoted strings
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .replace(/Read More\s*»/g, '') // Remove "Read More »" links
        .replace(/\d{1,2}\/\d{1,2}\/\d{4}\s+No Comments/g, '') // Remove date and "No Comments"
        .replace(/December \d{1,2}, \d{4}\s+No Comments/g, '') // Remove specific date patterns
        .replace(/May \d{1,2}, \d{4}\s+No Comments/g, '') // Remove specific date patterns
        .replace(/July \d{1,2}, \d{4}\s+No Comments/g, '') // Remove specific date patterns
        .replace(/September \d{1,2}, \d{4}\s+No Comments/g, '') // Remove specific date patterns
        .trim();
      
      console.log(`Successfully fetched content via proxy ${i + 1}`);
      
      // Record successful request for rate limiting tracking
      recordSuccessfulRequest(url);
      
      return { pageText, existingSchemaText, breadcrumbs, pageTitle };
      
    } catch (error) {
      console.warn(`Proxy ${i + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this is the last proxy, we'll throw the error
      if (i === proxyServices.length - 1) {
        break;
      }
      
      // Wait a bit before trying the next proxy (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, i), 5000); // Max 5 seconds
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all proxies failed - try browser automation as fallback
  console.error("All CORS proxy services failed:", lastError);
  console.log("Attempting browser automation fallback...");
  
  try {
    // Retry logic for browser automation API (up to 2 attempts)
    let browserAttempts = 0;
    const maxBrowserAttempts = 2;
    
    while (browserAttempts < maxBrowserAttempts) {
      try {
        console.log(`Browser automation attempt ${browserAttempts + 1}/${maxBrowserAttempts}`);
        
        const response = await fetch('http://localhost:3001/api/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(30000) // 30 second timeout for browser automation
        });

        if (response.ok) {
          const browserResult = await response.json();
          
          if (browserResult.success && browserResult.pageText) {
            console.log("Browser automation succeeded!");
            return {
              pageText: browserResult.pageText,
              existingSchemaText: browserResult.existingSchemaText,
              breadcrumbs: browserResult.breadcrumbs,
              pageTitle: browserResult.pageTitle
            };
          } else {
            console.warn("Browser automation failed:", browserResult.error);
            break; // Don't retry if the API responded but failed
          }
        } else {
          console.warn(`Browser automation API returned status: ${response.status}`);
          if (browserAttempts < maxBrowserAttempts - 1) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (browserError) {
        browserAttempts++;
        console.warn(`Browser automation attempt ${browserAttempts} failed:`, browserError);
        
        if (browserAttempts < maxBrowserAttempts) {
          // Wait before retrying (exponential backoff)
          const retryDelay = Math.min(2000 * Math.pow(2, browserAttempts - 1), 8000);
          console.log(`Retrying browser automation in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  } catch (browserError) {
    console.warn("Browser automation not available or failed:", browserError);
  }
  
  // Provide more specific error messages based on the type of failure
  if (lastError?.message.includes('timeout') || lastError?.message.includes('AbortError')) {
    throw new Error("Request timed out. The website might be slow to respond or blocking automated requests. Please try the manual content input option or try again later.");
  }
  
  if (lastError?.message.includes('404') || lastError?.message.includes('Not Found')) {
    throw new Error("The URL could not be found. Please check that the URL is correct and the page exists.");
  }
  
  if (lastError?.message.includes('403') || lastError?.message.includes('Forbidden')) {
    throw new Error("This website is protected by Cloudflare or similar security measures. Please use the 'Manual Content Input' option below.");
  }
  
  if (lastError?.message.includes('CORS') || lastError?.message.includes('cross-origin')) {
    throw new Error("CORS policy prevents access to this URL. All proxy services and browser automation failed. Please use the manual content input option.");
  }
  
  throw new Error("Failed to fetch content from the URL. The page might be down, blocking requests, or all services could be temporarily unavailable. Please use the manual content input option.");
};



// Content analysis patterns for predictable schema detection
const CONTENT_PATTERNS = {
  testimonial: {
    keywords: ['testimonial', 'testimonials', 'client says', 'customer says', 'what our clients say', 'check what our clients say', 'client feedback', 'customer feedback', 'client review', 'customer review'],
    schemaTypes: ['Review', 'Testimonial']
  },
  article: {
    keywords: ['article', 'blog', 'post', 'news', 'story', 'opinion', 'tutorial', 'guide'],
    schemaTypes: ['BlogPosting', 'NewsArticle', 'Article']
  },
  product: {
    keywords: ['buy', 'price', 'product', 'shop', 'cart', 'order', 'purchase', '$', '€', '£', '₹'],
    schemaTypes: ['Product', 'Offer']
  },
  recipe: {
    keywords: ['recipe', 'ingredients', 'cook', 'bake', 'prep time', 'servings', 'cooking time', 'method', 'instructions', 'directions', 'steps', 'preparation', 'how to', 'tablespoon', 'teaspoon', 'cup', 'chopped', 'minced', 'sliced', 'diced', 'organic', 'basmati rice', 'curry', 'vegetable', 'cooking', 'simmer', 'boil', 'heat', 'add', 'stir', 'season', 'serve'],
    schemaTypes: ['Recipe']
  },
  faq: {
    keywords: ['faq', 'question', 'answer', 'how to', 'what is', 'why', 'when', 'where'],
    schemaTypes: ['FAQPage']
  },
  howto: {
    keywords: ['step', 'instructions', 'tutorial', 'how to', 'guide', 'process', 'method'],
    schemaTypes: ['HowTo']
  },
  localBusiness: {
    keywords: ['address', 'phone', 'location', 'hours', 'contact', 'visit', 'store', 'restaurant'],
    schemaTypes: ['LocalBusiness', 'Restaurant', 'Store']
  },
  event: {
    keywords: ['event', 'date', 'time', 'venue', 'ticket', 'register', 'conference', 'meeting'],
    schemaTypes: ['Event']
  },
  review: {
    keywords: ['review', 'rating', 'stars', 'opinion', 'feedback'],
    schemaTypes: ['Review', 'AggregateRating']
  }
};

// Function to analyze content and determine likely schema types
export const analyzeContentForSchemaTypes = (pageText: string, url: string): string[] => {
  const text = pageText.toLowerCase();
  const urlLower = url.toLowerCase();
  const detectedTypes: string[] = [];
  
  // Define priority order for pattern matching (testimonials should be checked first)
  const priorityOrder = ['testimonial', 'review', 'product', 'recipe', 'faq', 'howto', 'event', 'localBusiness', 'article'];
  
  // Check patterns in priority order
  for (const category of priorityOrder) {
    const pattern = CONTENT_PATTERNS[category as keyof typeof CONTENT_PATTERNS];
    if (!pattern) continue;
    
    const hasKeywords = pattern.keywords.some(keyword => 
      text.includes(keyword) || urlLower.includes(keyword)
    );
    
    if (hasKeywords) {
      detectedTypes.push(...pattern.schemaTypes);
      
      // For testimonials, be more specific - if we detect testimonial keywords, 
      // don't also add article types unless there are strong article indicators
      if (category === 'testimonial') {
        const hasArticleKeywords = CONTENT_PATTERNS.article.keywords.some(keyword => 
          text.includes(keyword) && !['review', 'opinion'].includes(keyword)
        );
        if (!hasArticleKeywords) {
          // Remove article types if we found testimonials without strong article indicators
          return [...new Set(detectedTypes)];
        }
      }
    }
  }
  
  // Always include Article/BlogPosting for content pages if no specific type detected
  if (detectedTypes.length === 0 && text.length > 200) {
    detectedTypes.push('BlogPosting');
  }
  
  // Remove duplicates and return
  return [...new Set(detectedTypes)];
};

// Function to create a fallback schema when AI fails
const createFallbackSchema = (schemaType: string, pageText: string, websiteInfo: WebsiteInfo): RecommendedSchema => {
  // Extract basic information from page text
  const lines = pageText.split('\n').filter(line => line.trim().length > 0);
  const title = lines[0]?.trim() || 'Page Content';
  const description = lines.slice(1, 3).join(' ').substring(0, 200).trim() || 'Content from the page';
  
  // Create basic schema based on type
  let baseSchema: any = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "name": title,
    "description": description
  };

  // Add type-specific fields
  switch (schemaType) {
    case 'BlogPosting':
    case 'Article':
    case 'NewsArticle':
      baseSchema.headline = title;
      baseSchema.description = description;
      if (websiteInfo.companyName) {
        baseSchema.publisher = {
          "@type": "Organization",
          "name": websiteInfo.companyName,
          "logo": websiteInfo.companyLogoUrl ? {
            "@type": "ImageObject",
            "url": websiteInfo.companyLogoUrl
          } : undefined
        };
      }
      if (websiteInfo.founderName) {
        baseSchema.author = {
          "@type": "Person",
          "name": websiteInfo.founderName
        };
      }
      break;
    
    case 'Product':
      baseSchema.name = title;
      baseSchema.description = description;
      if (websiteInfo.companyName) {
        baseSchema.brand = {
          "@type": "Brand",
          "name": websiteInfo.companyName
        };
      }
      break;
    
    case 'LocalBusiness':
      baseSchema.name = title;
      baseSchema.description = description;
      break;
    
    case 'Review':
    case 'Testimonial':
      baseSchema.reviewBody = description;
      baseSchema.itemReviewed = {
        "@type": "Organization",
        "name": websiteInfo.companyName || title
      };
      // Try to extract author name from content
      const authorMatch = pageText.match(/(?:by|from|author:?)\s+([A-Za-z\s]+)/i);
      if (authorMatch) {
        baseSchema.author = {
          "@type": "Person",
          "name": authorMatch[1].trim()
        };
      }
      break;
  }

  // Remove undefined properties
  Object.keys(baseSchema).forEach(key => {
    if (baseSchema[key] === undefined) {
      delete baseSchema[key];
    }
  });

  return {
    schemaType,
    description: `Fallback ${schemaType} schema generated from page content. This ensures you always get a valid schema even when AI processing fails.`,
    jsonLd: JSON.stringify(baseSchema, null, 2),
    validationStatus: 'valid'
  };
};

export const analyzeUrlForSchemas = async (url: string, websiteInfo: WebsiteInfo, pageText: string, existingSchemaText: string): Promise<RecommendedSchema[]> => {
  
  // Analyze content to determine likely schema types
  const detectedSchemaTypes = analyzeContentForSchemaTypes(pageText, url);
  
  const existingSchemaContext = existingSchemaText
    ? `For context, the page already contains the following JSON-LD schemas. You can use this for inspiration or to avoid duplication, but your primary goal is to generate new, relevant schemas based on the page text.
    ---
    ${existingSchemaText}
    ---
    `
    : "The page does not appear to have any existing JSON-LD schemas.";

  const prompt = `
    You are an expert SEO specialist and a helpful assistant that generates structured data.

    Use the following information about the website/company when generating schemas where appropriate (e.g., for 'publisher', 'organization', 'author', 'logo' fields). If a value is not provided, do your best to find it from the page content, but prefer the information below if available.
    - Company Name: ${websiteInfo.companyName || 'Not provided'}
    - Founder/Main Author Name: ${websiteInfo.founderName || 'Not provided'}
    - Company Logo URL: ${websiteInfo.companyLogoUrl || 'Not provided'}

    ${existingSchemaContext}

    Your task is to analyze the following text content, which was extracted from the web page at this URL: ${url}.
    Note: The provided text is a portion of the full page content, limited to the first several thousand characters, to ensure efficiency. Your analysis should be based solely on the text provided below.

    HERE IS THE PAGE CONTENT:
    ---
    ${pageText.substring(0, 3000)
      .replace(/"Image"\s+/g, '')
      .replace(/"Annapoorna"\s+/g, '')
      .replace(/"\w+"\s+(?=\w)/g, '')
      .replace(/Read More\s*»/g, '')
      .replace(/\d{1,2}\/\d{1,2}\/\d{4}\s+No Comments/g, '')
      .replace(/December \d{1,2}, \d{4}\s+No Comments/g, '')
      .replace(/May \d{1,2}, \d{4}\s+No Comments/g, '')
      .replace(/July \d{1,2}, \d{4}\s+No Comments/g, '')
      .replace(/September \d{1,2}, \d{4}\s+No Comments/g, '')
      .replace(/\s\s+/g, ' ')
      .trim()}
    ---

    CONTENT ANALYSIS RESULTS:
    Based on content analysis, the following schema types are likely relevant: ${detectedSchemaTypes.join(', ')}

    CRITICAL INSTRUCTIONS FOR CONSISTENT RESULTS:
    1. ALWAYS generate schemas for these detected types: ${detectedSchemaTypes.join(', ')}
    2. Generate EXACTLY ${Math.min(detectedSchemaTypes.length, 3)} schemas (prioritize the most important ones)
    3. Use this EXACT order of priority: ${detectedSchemaTypes.join(' > ')}
    4. For each schema, follow this EXACT structure:
       - Extract the main title/headline from the content
       - Extract a description (first 150-200 characters of main content)
       - Extract author information if available
       - Extract publication date if available
       - Extract any other relevant data that appears in the content
    5. CRITICAL RULE: Do not invent, assume, or "hallucinate" any information. If a specific piece of data is not explicitly mentioned in the provided text, you MUST omit that property from the JSON-LD.
    6. For the 'jsonLd' field, provide the entire JSON-LD object as a single, minified string. The string MUST contain ONLY the JSON object, with no markdown formatting, comments, or any other text outside the JSON structure.
    7. Ensure each schema is complete and valid according to schema.org standards.
    8. Use consistent field names and structure across all schemas.

    SCHEMA GENERATION TEMPLATES:
    - BlogPosting: Must include @context, @type, headline, description, author, publisher, datePublished
    - Product: Must include @context, @type, name, description, brand, offers (if price available)
    - FAQPage: Must include @context, @type, mainEntity array with Question/Answer pairs
    - HowTo: Must include @context, @type, name, description, step array
    - LocalBusiness: Must include @context, @type, name, description, address (if available)
    - Event: Must include @context, @type, name, description, startDate, location (if available)
    - Review: Must include @context, @type, itemReviewed, reviewRating, author
    - Testimonial: Must include @context, @type, reviewBody, author (with name), datePublished (if available)
    - Recipe: Must include @context, @type, name, description, recipeIngredient array, recipeInstructions array. 
      CRITICAL: For Recipe schemas, also include image (ImageObject), nutrition (NutritionInformation), 
      video (VideoObject if available), keywords (comma-separated string), aggregateRating (AggregateRating), 
      prepTime, cookTime, totalTime (ISO 8601 duration format), recipeYield, recipeCategory, recipeCuisine, 
      author, datePublished. Extract ingredients as array of strings, instructions as array of HowToStep objects.
      RECIPE EXTRACTION RULES:
      - Look for ingredient lists (often marked with bullet points, numbers, or "Ingredients:" header)
      - Extract cooking instructions (often numbered steps or "Method:" section)
      - Parse cooking times (prep time, cook time, total time) and convert to ISO 8601 format (PT15M, PT30M, etc.)
      - Extract serving size/yield information
      - Identify cuisine type from content (Indian, Italian, etc.)
      - Extract recipe category (Main Course, Appetizer, Dessert, etc.)
      - Look for cooking methods (bake, fry, simmer, etc.)
      - Extract any nutrition information if available

    Generate schemas now following these exact instructions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, // Low temperature for more consistent results
        topP: 0.8, // Focus on most likely tokens
        topK: 20, // Limit vocabulary for consistency
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
      console.warn("Gemini API returned an empty response.");
      return [];
    }

    const parsedResponse: GeminiApiResponse = JSON.parse(jsonText);
    
    // Process each schema to ensure the jsonLd string is well-formatted and valid.
    const processedSchemas = parsedResponse.schemas.map(s => {
      try {
        // Clean up the string returned by the AI. It sometimes includes markdown backticks or isn't perfectly trimmed.
        const cleanedJsonLdString = s.jsonLd
          .trim()
          .replace(/^```json\s*/, '')
          .replace(/```\s*$/, '')
          .trim();

        const parsedJson = JSON.parse(cleanedJsonLdString);
        const formattedJsonLd = JSON.stringify(parsedJson, null, 2);

        // Basic semantic validation
        if (typeof parsedJson !== 'object' || parsedJson === null || Array.isArray(parsedJson)) {
          return { 
            ...s, 
            jsonLd: formattedJsonLd, 
            validationStatus: 'invalid' as const, 
            validationError: 'Schema must be a single JSON object.' 
          };
        }
        if (!('@context' in parsedJson) || !String(parsedJson['@context']).includes('schema.org')) {
          return { 
            ...s, 
            jsonLd: formattedJsonLd, 
            validationStatus: 'invalid' as const, 
            validationError: 'Missing or invalid "@context" property. It should contain "schema.org".' 
          };
        }

        const type = parsedJson['@type'];
        const typeMatch = Array.isArray(type) ? type.includes(s.schemaType) : type === s.schemaType;

        if (!type || !typeMatch) {
          return { 
            ...s, 
            jsonLd: formattedJsonLd, 
            validationStatus: 'invalid' as const, 
            validationError: `Mismatched "@type" property. Expected "${s.schemaType}", but found "${type || 'nothing'}".`
          };
        }

        return { ...s, jsonLd: formattedJsonLd, validationStatus: 'valid' as const };

      } catch (e) {
        console.error("Failed to parse nested jsonLd string for schema:", s.schemaType, e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        // If the API returns invalid JSON, we still want to return a
        // well-formatted string to the frontend for display, so we create an error object.
        const errorJson = JSON.stringify({
          error: "The AI returned invalid JSON for this schema.",
          details: errorMessage,
          originalString: s.jsonLd,
        }, null, 2);

        return { 
          ...s, 
          jsonLd: errorJson, 
          validationStatus: 'invalid' as const, 
          validationError: `Invalid JSON format: ${errorMessage}` 
        };
      }
    });

    // Ensure we have at least one valid schema, create fallback if needed
    const validSchemas = processedSchemas.filter(s => s.validationStatus === 'valid');
    if (validSchemas.length === 0 && detectedSchemaTypes.length > 0) {
      // Create a basic fallback schema
      const fallbackSchema = createFallbackSchema(detectedSchemaTypes[0], pageText, websiteInfo);
      processedSchemas.push(fallbackSchema as any);
    }

    return processedSchemas;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

    if (errorMessage.includes('xhr error') || errorMessage.includes('500')) {
        throw new Error("The AI service failed to process the request, possibly due to the page content being too large or a temporary network issue. Please try again or with a different URL.");
    }
    
    if (errorMessage.includes('fetch')) {
       throw error;
    }
    
    throw new Error("An error occurred while communicating with the AI service.");
  }
};