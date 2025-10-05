import OpenAI from 'openai';
import { GoogleGenAI, Type } from "@google/genai";
import type { RecommendedSchema, WebsiteInfo, BreadcrumbItem } from "../types";
import { 
  isRateLimited, 
  recordSuccessfulRequest, 
  recordRateLimit, 
  getRequestDelay, 
  isRateLimitResponse, 
  getRetryAfter 
} from "./rateLimiting";

// API Keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

// Initialize AI providers
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
    'Recipe': {
      required: ['name', 'description', 'recipeIngredient', 'recipeInstructions'],
      recommended: ['image', 'author', 'datePublished', 'prepTime', 'cookTime', 'totalTime', 'recipeYield', 'nutrition', 'video', 'keywords', 'aggregateRating', 'recipeCategory', 'recipeCuisine']
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

// OpenAI GPT-4o schema generation
const generateWithOpenAI = async (
  pageText: string, 
  url: string, 
  websiteInfo: WebsiteInfo, 
  existingSchemaText: string,
  detectedSchemaTypes: string[]
): Promise<RecommendedSchema[]> => {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

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

Page Content:
---
${pageText.substring(0, 8000)}
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

Return a JSON array with this exact structure:
[
  {
    "schemaType": "SchemaType",
    "description": "Brief explanation of why this schema is recommended",
    "jsonLd": "Complete JSON-LD object as a string"
  }
]
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SEO specialist who generates valid JSON-LD structured data. Always return valid JSON arrays with the exact structure requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    const parsedResponse = JSON.parse(content);
    const schemas = Array.isArray(parsedResponse) ? parsedResponse : parsedResponse.schemas || [];

    return schemas.map((s: any) => ({
      schemaType: s.schemaType,
      description: s.description,
      jsonLd: s.jsonLd,
      validationStatus: 'pending' as const
    }));

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Enhanced Gemini schema generation (your existing logic)
const generateWithGemini = async (
  pageText: string, 
  url: string, 
  websiteInfo: WebsiteInfo, 
  existingSchemaText: string,
  detectedSchemaTypes: string[]
): Promise<RecommendedSchema[]> => {
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
    - Testimonial: Must include @context, @type, reviewBody, author (with name), datePublished (if available)

    Generate schemas now following these exact instructions.
  `;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
        topP: 0.8,
        topK: 20,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
      console.warn("Gemini API returned an empty response.");
      return [];
    }

    const parsedResponse = JSON.parse(jsonText);
    return parsedResponse.schemas.map((s: any) => ({
      schemaType: s.schemaType,
      description: s.description,
      jsonLd: s.jsonLd,
      validationStatus: 'pending' as const
    }));

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(`Gemini API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Content analysis patterns (from your existing code)
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
const analyzeContentForSchemaTypes = (pageText: string, url: string): string[] => {
  const text = pageText.toLowerCase();
  const urlLower = url.toLowerCase();
  const detectedTypes: string[] = [];
  
  const priorityOrder = ['testimonial', 'review', 'product', 'recipe', 'faq', 'howto', 'event', 'localBusiness', 'article'];
  
  for (const category of priorityOrder) {
    const pattern = CONTENT_PATTERNS[category as keyof typeof CONTENT_PATTERNS];
    if (!pattern) continue;
    
    const hasKeywords = pattern.keywords.some(keyword => 
      text.includes(keyword) || urlLower.includes(keyword)
    );
    
    if (hasKeywords) {
      detectedTypes.push(...pattern.schemaTypes);
      
      if (category === 'testimonial') {
        const hasArticleKeywords = CONTENT_PATTERNS.article.keywords.some(keyword => 
          text.includes(keyword) && !['review', 'opinion'].includes(keyword)
        );
        if (!hasArticleKeywords) {
          return [...new Set(detectedTypes)];
        }
      }
    }
  }
  
  if (detectedTypes.length === 0 && text.length > 200) {
    detectedTypes.push('BlogPosting');
  }
  
  return [...new Set(detectedTypes)];
};

// Main enhanced schema generation function with multi-provider support
export const generateSchemasWithFallback = async (
  url: string, 
  websiteInfo: WebsiteInfo, 
  pageText: string, 
  existingSchemaText: string
): Promise<RecommendedSchema[]> => {
  console.log('Starting enhanced schema generation with multi-provider support');
  
  // Analyze content to determine likely schema types
  const detectedSchemaTypes = analyzeContentForSchemaTypes(pageText, url);
  console.log('Detected schema types:', detectedSchemaTypes);

  // Try providers in order of preference
  const providers = [
    { name: 'OpenAI GPT-4o', fn: generateWithOpenAI, available: !!openai },
    { name: 'Google Gemini', fn: generateWithGemini, available: true }
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (!provider.available) {
      console.log(`Skipping ${provider.name} - not available`);
      continue;
    }

    try {
      console.log(`Attempting schema generation with ${provider.name}`);
      
      const schemas = await provider.fn(
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
          console.error(`Failed to parse JSON-LD for schema ${schema.schemaType}:`, e);
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
        console.log('No valid schemas generated, creating fallback');
        // Create a basic fallback schema (you can implement this)
        const fallbackSchema = createFallbackSchema(detectedSchemaTypes[0], pageText, websiteInfo);
        processedSchemas.push(fallbackSchema as any);
      }

      console.log(`Successfully generated ${processedSchemas.length} schemas with ${provider.name}`);
      return processedSchemas;

    } catch (error) {
      console.warn(`${provider.name} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Continue to next provider
      continue;
    }
  }

  // If all providers failed
  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
};

// Fallback schema creation (from your existing code)
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

// Export the content scraping function from your existing service
export { scrapePageContent } from './geminiService';
