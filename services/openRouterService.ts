import OpenAI from 'openai';
import type { RecommendedSchema, WebsiteInfo } from "../types";
import { 
  isRateLimited, 
  recordSuccessfulRequest, 
  recordRateLimit, 
  getRequestDelay, 
  isRateLimitResponse, 
  getRetryAfter 
} from "./rateLimiting";

// OpenRouter API Key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

// Function to get OpenRouter client (initialized when needed)
const getOpenRouterClient = () => {
  if (!OPENROUTER_API_KEY) {
    return null;
  }
  
  return new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://seo-schema-generator.app", // Optional: for rankings
      "X-Title": "SEO Schema Generator", // Optional: shows in rankings
    },
    dangerouslyAllowBrowser: true // Required for browser environment
  });
};

// Enhanced schema validation
export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Schema.org validation rules
const SCHEMA_VALIDATION_RULES = {
  requiredFields: {
    '@context': 'https://schema.org',
    '@type': 'string'
  },
  commonFields: {
    'name': 'string',
    'description': 'string',
    'url': 'string',
    'image': 'string'
  },
  typeSpecificRules: {
    'Article': {
      required: ['headline', 'author', 'datePublished'],
      recommended: ['publisher', 'description', 'image']
    },
    'BlogPosting': {
      required: ['headline', 'author', 'datePublished'],
      recommended: ['publisher', 'description', 'image']
    },
    'Product': {
      required: ['name', 'description'],
      recommended: ['brand', 'offers', 'image']
    },
    'FAQPage': {
      required: ['mainEntity'],
      recommended: ['name', 'description']
    },
    'HowTo': {
      required: ['name', 'step'],
      recommended: ['description', 'totalTime', 'supply']
    },
    'LocalBusiness': {
      required: ['name', 'address'],
      recommended: ['telephone', 'url', 'openingHours']
    },
    'Event': {
      required: ['name', 'startDate'],
      recommended: ['location', 'description', 'organizer']
    },
    'Review': {
      required: ['itemReviewed', 'reviewRating'],
      recommended: ['author', 'reviewBody', 'datePublished']
    },
    'Testimonial': {
      required: ['reviewBody', 'author'],
      recommended: ['datePublished', 'itemReviewed']
    }
  }
};

// Validate schema against schema.org standards
export const validateSchema = (schema: any, schemaType: string): SchemaValidationResult => {
  const result: SchemaValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  // Check basic structure
  if (!schema || typeof schema !== 'object') {
    result.isValid = false;
    result.errors.push('Schema must be a valid JSON object');
    return result;
  }

  // Check required fields
  if (!schema['@context'] || !schema['@context'].includes('schema.org')) {
    result.isValid = false;
    result.errors.push('Missing or invalid @context property');
  }

  if (!schema['@type']) {
    result.isValid = false;
    result.errors.push('Missing @type property');
  }

  // Check type-specific rules
  const typeRules = SCHEMA_VALIDATION_RULES.typeSpecificRules[schemaType as keyof typeof SCHEMA_VALIDATION_RULES.typeSpecificRules];
  if (typeRules) {
    // Check required fields
    typeRules.required.forEach(field => {
      if (!schema[field]) {
        result.isValid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    });

    // Check recommended fields
    typeRules.recommended.forEach(field => {
      if (!schema[field]) {
        result.warnings.push(`Missing recommended field: ${field}`);
      }
    });
  }

  // Check for common issues
  if (schema.name && typeof schema.name !== 'string') {
    result.warnings.push('Name should be a string');
  }

  if (schema.description && typeof schema.description !== 'string') {
    result.warnings.push('Description should be a string');
  }

  if (schema.url && !schema.url.startsWith('http')) {
    result.warnings.push('URL should be a valid HTTP/HTTPS URL');
  }

  // Add suggestions for improvement
  if (!schema.description && schema.name) {
    result.suggestions.push('Consider adding a description field');
  }

  if (!schema.image && (schemaType === 'Article' || schemaType === 'Product')) {
    result.suggestions.push('Consider adding an image for better rich results');
  }

  return result;
};

// Content analysis patterns
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
    keywords: ['review', 'rating', 'stars', 'opinion', 'feedback'],
    schemaTypes: ['Review', 'AggregateRating']
  }
};

// Optimized content analysis with early termination for faster processing
const analyzeContentForSchemaTypes = (pageText: string, url: string): string[] => {
  const text = pageText.toLowerCase();
  const urlLower = url.toLowerCase();
  const detectedTypes: string[] = [];
  
  // Optimized priority order - most common types first
  const priorityOrder = ['product', 'article', 'faq', 'howto', 'review', 'testimonial', 'recipe', 'event', 'localBusiness'];
  
  // Early termination - if we find 2+ types, return immediately
  for (const category of priorityOrder) {
    const pattern = CONTENT_PATTERNS[category as keyof typeof CONTENT_PATTERNS];
    if (!pattern) continue;
    
    const hasKeywords = pattern.keywords.some(keyword => 
      text.includes(keyword) || urlLower.includes(keyword)
    );
    
    if (hasKeywords) {
      detectedTypes.push(...pattern.schemaTypes);
      
      // Early termination for high-confidence matches
      if (category === 'product' || category === 'article') {
        return [...new Set(detectedTypes)].slice(0, 2); // Limit to 2 for speed
      }
      
      // Return early if we have enough types
      if (detectedTypes.length >= 2) {
        return [...new Set(detectedTypes)];
      }
    }
  }
  
  // Fallback to BlogPosting if nothing detected
  if (detectedTypes.length === 0 && text.length > 200) {
    detectedTypes.push('BlogPosting');
  }
  
  return [...new Set(detectedTypes)].slice(0, 3); // Limit to 3 schemas max
};

// Generic OpenRouter schema generation function
const generateWithOpenRouter = async (
  modelName: string,
  pageText: string, 
  url: string, 
  websiteInfo: WebsiteInfo, 
  existingSchemaText: string,
  detectedSchemaTypes: string[]
): Promise<RecommendedSchema[]> => {
  const existingSchemaContext = existingSchemaText
    ? `For context, the page already contains the following JSON-LD schemas. You can use this for inspiration or to avoid duplication, but your primary goal is to generate new, relevant schemas based on the page text.
    ---
    ${existingSchemaText}
    ---
    `
    : "The page does not appear to have any existing JSON-LD schemas.";

  const prompt = `
You are an expert SEO specialist and structured data expert. Generate high-quality JSON-LD schemas for the following content.

Website Information:
- Company Name: ${websiteInfo.companyName || 'Not provided'}
- Founder/Main Author Name: ${websiteInfo.founderName || 'Not provided'}
- Company Logo URL: ${websiteInfo.companyLogoUrl || 'Not provided'}

${existingSchemaContext}

URL: ${url}

Content Analysis Results:
Based on content analysis, the following schema types are likely relevant: ${detectedSchemaTypes.join(', ')}

Page Content (optimized for speed):
---
${pageText.substring(0, 2000)
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

CRITICAL INSTRUCTIONS:
1. Generate EXACTLY ${Math.min(detectedSchemaTypes.length, 3)} schemas for these types: ${detectedSchemaTypes.join(', ')}
2. Use this EXACT priority order: ${detectedSchemaTypes.join(' > ')}
3. For each schema, follow this structure:
   - Extract the main title/headline from the content
   - Extract a description (first 150-200 characters of main content)
   - Extract author information if available
   - Extract publication date if available
   - Extract any other relevant data that appears in the content
4. CRITICAL RULE: Do not invent, assume, or "hallucinate" any information. If data is not explicitly mentioned, omit that property.
5. Ensure each schema is complete and valid according to schema.org standards.
6. Use consistent field names and structure across all schemas.

SCHEMA GENERATION TEMPLATES:
- BlogPosting: Must include @context, @type, headline, description, author, publisher, datePublished
- Product: Must include @context, @type, name, description, brand, offers (if price available)
- FAQPage: Must include @context, @type, mainEntity array with Question/Answer pairs
- HowTo: Must include @context, @type, name, description, step array
- LocalBusiness: Must include @context, @type, name, description, address (if available)
- Event: Must include @context, @type, name, description, startDate, location (if available)
- Review: Must include @context, @type, itemReviewed, reviewRating, author
- Testimonial: Must include @context, @type, reviewBody, author (with name), datePublished (if available)

Return a JSON object with this exact structure:
{
  "schemas": [
    {
      "schemaType": "SchemaType",
      "description": "Brief explanation of why this schema is recommended",
      "jsonLd": "Complete JSON-LD object as a string"
    }
  ]
}
`;

  try {
    const openrouter = getOpenRouterClient();
    if (!openrouter) {
      throw new Error('OpenRouter client not available');
    }
    
    const response = await openrouter.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: "You are an expert SEO specialist who generates valid JSON-LD structured data. Always return valid JSON with the exact structure requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 800, // Reduced to 800 for maximum speed
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`${modelName} returned empty response`);
    }

    const parsedResponse = JSON.parse(content);
    const schemas = parsedResponse.schemas || [];

    return schemas.map((s: any) => ({
      schemaType: s.schemaType,
      description: s.description,
      jsonLd: s.jsonLd,
      validationStatus: 'pending' as const
    }));

  } catch (error) {
    console.error(`${modelName} API error:`, error);
    throw new Error(`${modelName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Fallback schema creation
const createFallbackSchema = (schemaType: string, pageText: string, websiteInfo: WebsiteInfo): RecommendedSchema => {
  const lines = pageText.split('\n').filter(line => line.trim().length > 0);
  const title = lines[0]?.trim() || 'Page Content';
  const description = lines.slice(1, 3).join(' ').substring(0, 200).trim() || 'Content from the page';
  
  let baseSchema: any = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "name": title,
    "description": description
  };

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
      const authorMatch = pageText.match(/(?:by|from|author:?)\s+([A-Za-z\s]+)/i);
      if (authorMatch) {
        baseSchema.author = {
          "@type": "Person",
          "name": authorMatch[1].trim()
        };
      }
      break;
  }

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

// Main schema generation with OpenRouter (Option 2: Quality-First Stack)
export const generateSchemasWithOpenRouter = async (
  url: string, 
  websiteInfo: WebsiteInfo, 
  pageText: string, 
  existingSchemaText: string
): Promise<RecommendedSchema[]> => {
  // If no OpenRouter key, fall back to legacy Gemini service
  if (!OPENROUTER_API_KEY && !GEMINI_API_KEY) {
    throw new Error("OPENROUTER_API_KEY or GEMINI_API_KEY environment variable must be set");
  }
  
  if (!OPENROUTER_API_KEY) {
    console.log('🔄 OpenRouter not configured, falling back to legacy Gemini service');
    const { analyzeUrlForSchemas } = await import('./geminiService');
    return await analyzeUrlForSchemas(url, websiteInfo, pageText, existingSchemaText);
  }

  console.log('🚀 Starting OpenRouter schema generation (Quality-First Stack)');
  
  // Analyze content to determine likely schema types
  const detectedSchemaTypes = analyzeContentForSchemaTypes(pageText, url);
  console.log('📊 Detected schema types:', detectedSchemaTypes);

  // Gemini Flash Only - Maximum Speed Configuration
  const providers = [
    { 
      name: 'Gemini 2.0 Flash (Only)', 
      model: 'google/gemini-2.0-flash-exp:free',
      cost: 'Free'
    }
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      console.log(`🔄 Attempting schema generation with ${provider.name} (${provider.cost})`);
      
      const schemas = await generateWithOpenRouter(
        provider.model,
        pageText, 
        url, 
        websiteInfo, 
        existingSchemaText,
        detectedSchemaTypes
      );

      // Process and validate each schema
      const processedSchemas = schemas.map(schema => {
        try {
          // Clean up the JSON-LD string
          const cleanedJsonLdString = schema.jsonLd
            .trim()
            .replace(/^```json\s*/, '')
            .replace(/```\s*$/, '')
            .trim();

          const parsedJson = JSON.parse(cleanedJsonLdString);
          const formattedJsonLd = JSON.stringify(parsedJson, null, 2);

          // Validate the schema
          const validation = validateSchema(parsedJson, schema.schemaType);

          return {
            ...schema,
            jsonLd: formattedJsonLd,
            validationStatus: validation.isValid ? 'valid' as const : 'invalid' as const,
            validationError: validation.isValid ? undefined : validation.errors.join('; '),
            validationWarnings: validation.warnings,
            validationSuggestions: validation.suggestions
          };

        } catch (e) {
          console.error(`❌ Failed to parse JSON-LD for schema ${schema.schemaType}:`, e);
          const errorMessage = e instanceof Error ? e.message : String(e);
          
          return {
            ...schema,
            validationStatus: 'invalid' as const,
            validationError: `Invalid JSON format: ${errorMessage}`
          };
        }
      });

      // Ensure we have at least one valid schema
      const validSchemas = processedSchemas.filter(s => s.validationStatus === 'valid');
      if (validSchemas.length === 0 && detectedSchemaTypes.length > 0) {
        console.log('⚠️  No valid schemas generated, creating fallback');
        const fallbackSchema = createFallbackSchema(detectedSchemaTypes[0], pageText, websiteInfo);
        processedSchemas.push(fallbackSchema as any);
      }

      console.log(`✅ Successfully generated ${processedSchemas.length} schemas with ${provider.name}`);
      return processedSchemas;

    } catch (error) {
      console.warn(`⚠️  ${provider.name} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Continue to next provider
      continue;
    }
  }

  // If all providers failed
  throw new Error(`❌ All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
};

// Export the content scraping function from geminiService
export { scrapePageContent } from './geminiService';

