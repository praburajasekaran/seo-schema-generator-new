import { GoogleGenAI, Type } from "@google/genai";
import type { RecommendedSchema, GeminiApiResponse, WebsiteInfo, BreadcrumbItem } from "../types";

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
  // Using a CORS proxy to fetch the content from the client-side.
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch page content via proxy. The target site returned status: ${response.status}`);
    }
    const html = await response.text();
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
    const selectorsToRemove = ['header', 'footer', 'nav', 'aside', 'form', 'script', 'style', '[role="navigation"]', '[role="search"]', '[role="banner"]', '[role="contentinfo"]'];
    selectorsToRemove.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    // 4. Extract the main text content
    const mainContentElement = doc.querySelector('main') || doc.querySelector('article') || doc.body;
    let pageText = mainContentElement.textContent || "";
    
    // Clean up excessive whitespace and newlines
    pageText = pageText.replace(/\s\s+/g, ' ').trim();
    
    return { pageText, existingSchemaText, breadcrumbs, pageTitle };
  } catch (error) {
    console.error("Scraping failed:", error);
    throw new Error("Failed to fetch content from the URL. The page might be down, blocking requests, or the CORS proxy service could be unavailable.");
  }
};


// Content analysis patterns for predictable schema detection
const CONTENT_PATTERNS = {
  article: {
    keywords: ['article', 'blog', 'post', 'news', 'story', 'opinion', 'review', 'tutorial', 'guide'],
    schemaTypes: ['BlogPosting', 'NewsArticle', 'Article']
  },
  product: {
    keywords: ['buy', 'price', 'product', 'shop', 'cart', 'order', 'purchase', '$', '€', '£', '₹'],
    schemaTypes: ['Product', 'Offer']
  },
  recipe: {
    keywords: ['recipe', 'ingredients', 'cook', 'bake', 'prep time', 'servings', 'cooking time'],
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
    keywords: ['review', 'rating', 'stars', 'opinion', 'feedback', 'testimonial'],
    schemaTypes: ['Review', 'AggregateRating']
  }
};

// Function to analyze content and determine likely schema types
const analyzeContentForSchemaTypes = (pageText: string, url: string): string[] => {
  const text = pageText.toLowerCase();
  const urlLower = url.toLowerCase();
  const detectedTypes: string[] = [];
  
  // Check each pattern
  Object.entries(CONTENT_PATTERNS).forEach(([category, pattern]) => {
    const hasKeywords = pattern.keywords.some(keyword => 
      text.includes(keyword) || urlLower.includes(keyword)
    );
    
    if (hasKeywords) {
      detectedTypes.push(...pattern.schemaTypes);
    }
  });
  
  // Always include Article/BlogPosting for content pages
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
    ${pageText.substring(0, 8000)} 
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
            validationStatus: 'invalid', 
            validationError: 'Schema must be a single JSON object.' 
          };
        }
        if (!('@context' in parsedJson) || !String(parsedJson['@context']).includes('schema.org')) {
          return { 
            ...s, 
            jsonLd: formattedJsonLd, 
            validationStatus: 'invalid', 
            validationError: 'Missing or invalid "@context" property. It should contain "schema.org".' 
          };
        }

        const type = parsedJson['@type'];
        const typeMatch = Array.isArray(type) ? type.includes(s.schemaType) : type === s.schemaType;

        if (!type || !typeMatch) {
          return { 
            ...s, 
            jsonLd: formattedJsonLd, 
            validationStatus: 'invalid', 
            validationError: `Mismatched "@type" property. Expected "${s.schemaType}", but found "${type || 'nothing'}".`
          };
        }

        return { ...s, jsonLd: formattedJsonLd, validationStatus: 'valid' };

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
          validationStatus: 'invalid', 
          validationError: `Invalid JSON format: ${errorMessage}` 
        };
      }
    });

    // Ensure we have at least one valid schema, create fallback if needed
    const validSchemas = processedSchemas.filter(s => s.validationStatus === 'valid');
    if (validSchemas.length === 0 && detectedSchemaTypes.length > 0) {
      // Create a basic fallback schema
      const fallbackSchema = createFallbackSchema(detectedSchemaTypes[0], pageText, websiteInfo);
      processedSchemas.push(fallbackSchema);
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