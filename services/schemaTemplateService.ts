import type { RecommendedSchema, WebsiteInfo } from "../types";

// Schema Markup Visualizer API integration
const SCHEMA_VISUALIZER_API_BASE = 'https://schemavisualizer.net/api';

// Template-based schema generation using proven patterns
export const generateSchemaFromTemplate = async (
  schemaType: string,
  content: any,
  websiteInfo: WebsiteInfo
): Promise<RecommendedSchema> => {
  console.log(`Generating ${schemaType} schema from template`);

  try {
    // Try Schema Markup Visualizer API first
    const apiResult = await generateWithSchemaVisualizerAPI(schemaType, content, websiteInfo);
    if (apiResult) {
      return apiResult;
    }
  } catch (error) {
    console.warn('Schema Visualizer API failed, falling back to local templates:', error);
  }

  // Fallback to local templates
  return generateWithLocalTemplate(schemaType, content, websiteInfo);
};

// Schema Markup Visualizer API integration
const generateWithSchemaVisualizerAPI = async (
  schemaType: string,
  content: any,
  websiteInfo: WebsiteInfo
): Promise<RecommendedSchema | null> => {
  try {
    const response = await fetch(`${SCHEMA_VISUALIZER_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schemaType,
        content: {
          title: content.title || content.headline || content.name,
          description: content.description,
          url: content.url,
          image: content.image,
          author: content.author || websiteInfo.founderName,
          company: websiteInfo.companyName,
          logo: websiteInfo.companyLogoUrl,
          ...content
        }
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.schema) {
      return {
        schemaType,
        description: `Template-based ${schemaType} schema generated using Schema Markup Visualizer API`,
        jsonLd: JSON.stringify(result.schema, null, 2),
        validationStatus: 'valid'
      };
    }

    return null;
  } catch (error) {
    console.warn('Schema Visualizer API error:', error);
    return null;
  }
};

// Local template-based generation
const generateWithLocalTemplate = (
  schemaType: string,
  content: any,
  websiteInfo: WebsiteInfo
): RecommendedSchema => {
  const templates = getSchemaTemplates();
  const template = templates[schemaType as keyof typeof templates];
  
  if (!template) {
    throw new Error(`No template available for schema type: ${schemaType}`);
  }

  const schema = template.generator(content, websiteInfo);
  
  return {
    schemaType,
    description: `Template-based ${schemaType} schema generated using proven patterns`,
    jsonLd: JSON.stringify(schema, null, 2),
    validationStatus: 'valid'
  };
};

// Comprehensive schema templates based on schema.org best practices
const getSchemaTemplates = () => ({
  Article: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": content.title || content.headline || "Article Title",
      "description": content.description || "Article description",
      "url": content.url || "",
      "image": content.image ? {
        "@type": "ImageObject",
        "url": content.image
      } : undefined,
      "author": content.author ? {
        "@type": "Person",
        "name": content.author
      } : websiteInfo.founderName ? {
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
      "datePublished": content.datePublished || new Date().toISOString(),
      "dateModified": content.dateModified || new Date().toISOString()
    })
  },

  BlogPosting: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": content.title || content.headline || "Blog Post Title",
      "description": content.description || "Blog post description",
      "url": content.url || "",
      "image": content.image ? {
        "@type": "ImageObject",
        "url": content.image
      } : undefined,
      "author": content.author ? {
        "@type": "Person",
        "name": content.author
      } : websiteInfo.founderName ? {
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
      "datePublished": content.datePublished || new Date().toISOString(),
      "dateModified": content.dateModified || new Date().toISOString()
    })
  },

  Product: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": content.name || content.title || "Product Name",
      "description": content.description || "Product description",
      "image": content.image ? {
        "@type": "ImageObject",
        "url": content.image
      } : undefined,
      "brand": content.brand || websiteInfo.companyName ? {
        "@type": "Brand",
        "name": content.brand || websiteInfo.companyName
      } : undefined,
      "offers": content.price ? {
        "@type": "Offer",
        "price": content.price,
        "priceCurrency": content.currency || "USD",
        "availability": "https://schema.org/InStock"
      } : undefined,
      "aggregateRating": content.rating ? {
        "@type": "AggregateRating",
        "ratingValue": content.rating,
        "reviewCount": content.reviewCount || 1
      } : undefined
    })
  },

  FAQPage: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "name": content.title || "Frequently Asked Questions",
      "description": content.description || "Common questions and answers",
      "mainEntity": content.faqs || content.questions || [
        {
          "@type": "Question",
          "name": "What is this about?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "This is a frequently asked questions page."
          }
        }
      ]
    })
  },

  HowTo: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": content.title || content.name || "How To Guide",
      "description": content.description || "Step-by-step instructions",
      "image": content.image ? {
        "@type": "ImageObject",
        "url": content.image
      } : undefined,
      "totalTime": content.totalTime || "PT30M",
      "supply": content.supplies || [],
      "tool": content.tools || [],
      "step": content.steps || [
        {
          "@type": "HowToStep",
          "name": "Step 1",
          "text": "First step instructions"
        }
      ]
    })
  },

  LocalBusiness: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": content.name || websiteInfo.companyName || "Business Name",
      "description": content.description || "Local business description",
      "url": content.url || "",
      "telephone": content.phone || content.telephone,
      "address": content.address ? {
        "@type": "PostalAddress",
        "streetAddress": content.address.streetAddress,
        "addressLocality": content.address.city,
        "addressRegion": content.address.state,
        "postalCode": content.address.postalCode,
        "addressCountry": content.address.country
      } : undefined,
      "openingHours": content.openingHours || [],
      "image": content.image ? {
        "@type": "ImageObject",
        "url": content.image
      } : undefined
    })
  },

  Event: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "Event",
      "name": content.name || content.title || "Event Name",
      "description": content.description || "Event description",
      "startDate": content.startDate || new Date().toISOString(),
      "endDate": content.endDate,
      "location": content.location ? {
        "@type": content.location.type || "Place",
        "name": content.location.name,
        "address": content.location.address
      } : undefined,
      "organizer": content.organizer || websiteInfo.companyName ? {
        "@type": "Organization",
        "name": content.organizer || websiteInfo.companyName
      } : undefined,
      "image": content.image ? {
        "@type": "ImageObject",
        "url": content.image
      } : undefined,
      "offers": content.price ? {
        "@type": "Offer",
        "price": content.price,
        "priceCurrency": content.currency || "USD"
      } : undefined
    })
  },

  Review: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "Review",
      "itemReviewed": content.itemReviewed || {
        "@type": "Organization",
        "name": websiteInfo.companyName || "Reviewed Item"
      },
      "reviewRating": content.rating ? {
        "@type": "Rating",
        "ratingValue": content.rating,
        "bestRating": content.bestRating || 5
      } : undefined,
      "author": content.author ? {
        "@type": "Person",
        "name": content.author
      } : undefined,
      "reviewBody": content.reviewBody || content.description || "Review content",
      "datePublished": content.datePublished || new Date().toISOString()
    })
  },

  Testimonial: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "Review",
      "reviewBody": content.reviewBody || content.testimonial || content.description || "Customer testimonial",
      "author": content.author ? {
        "@type": "Person",
        "name": content.author
      } : undefined,
      "itemReviewed": content.itemReviewed || {
        "@type": "Organization",
        "name": websiteInfo.companyName || "Our Service"
      },
      "datePublished": content.datePublished || new Date().toISOString(),
      "reviewRating": content.rating ? {
        "@type": "Rating",
        "ratingValue": content.rating,
        "bestRating": 5
      } : undefined
    })
  },

  Recipe: {
    generator: (content: any, websiteInfo: WebsiteInfo) => ({
      "@context": "https://schema.org",
      "@type": "Recipe",
      "name": content.name || content.title || "Recipe Name",
      "description": content.description || "Recipe description",
      "image": content.image ? (Array.isArray(content.image) ? content.image.map((img: string) => ({
        "@type": "ImageObject",
        "url": img
      })) : {
        "@type": "ImageObject",
        "url": content.image
      }) : undefined,
      "author": content.author ? {
        "@type": "Person",
        "name": content.author
      } : websiteInfo.founderName ? {
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
      "datePublished": content.datePublished || new Date().toISOString(),
      "dateModified": content.dateModified || new Date().toISOString(),
      "prepTime": content.prepTime || "PT15M",
      "cookTime": content.cookTime || "PT30M",
      "totalTime": content.totalTime || "PT45M",
      "recipeYield": content.servings || content.recipeYield || "4",
      "recipeCategory": content.category || "Main Course",
      "recipeCuisine": content.cuisine || "International",
      "recipeIngredient": content.ingredients || [],
      "recipeInstructions": content.instructions || [],
      "nutrition": content.nutrition ? {
        "@type": "NutritionInformation",
        "calories": content.nutrition.calories,
        "fatContent": content.nutrition.fatContent,
        "saturatedFatContent": content.nutrition.saturatedFatContent,
        "cholesterolContent": content.nutrition.cholesterolContent,
        "sodiumContent": content.nutrition.sodiumContent,
        "carbohydrateContent": content.nutrition.carbohydrateContent,
        "fiberContent": content.nutrition.fiberContent,
        "sugarContent": content.nutrition.sugarContent,
        "proteinContent": content.nutrition.proteinContent
      } : undefined,
      "video": content.video ? {
        "@type": "VideoObject",
        "name": content.video.name || content.name || content.title,
        "description": content.video.description || content.description,
        "thumbnailUrl": content.video.thumbnailUrl,
        "contentUrl": content.video.contentUrl,
        "embedUrl": content.video.embedUrl,
        "uploadDate": content.video.uploadDate || content.datePublished
      } : undefined,
      "keywords": content.keywords || content.tags ? (Array.isArray(content.keywords || content.tags) ? 
        (content.keywords || content.tags).join(', ') : 
        (content.keywords || content.tags)) : undefined,
      "aggregateRating": content.aggregateRating ? {
        "@type": "AggregateRating",
        "ratingValue": content.aggregateRating.ratingValue,
        "reviewCount": content.aggregateRating.reviewCount,
        "bestRating": content.aggregateRating.bestRating || 5,
        "worstRating": content.aggregateRating.worstRating || 1
      } : content.rating ? {
        "@type": "AggregateRating",
        "ratingValue": content.rating,
        "reviewCount": content.reviewCount || 1,
        "bestRating": 5,
        "worstRating": 1
      } : undefined,
      "recipeDifficulty": content.difficulty || "Easy",
      "recipeServings": content.servings || "4",
      "cookingMethod": content.cookingMethod || "Stovetop",
      "suitableForDiet": content.suitableForDiet || ["Vegetarian", "Vegan"]
    })
  }
});

// Extract content data for template generation
export const extractContentForTemplate = (pageText: string, url: string, existingSchemaText: string) => {
  const lines = pageText.split('\n').filter(line => line.trim().length > 0);
  
  // Extract basic information
  const title = lines[0]?.trim() || 'Page Content';
  const description = lines.slice(1, 3).join(' ').substring(0, 200).trim() || 'Content from the page';
  
  // Extract structured data from existing schemas
  let existingData: any = {};
  if (existingSchemaText) {
    try {
      const schemas = existingSchemaText.split('---').map(s => s.trim()).filter(s => s);
      schemas.forEach(schemaText => {
        try {
          const parsed = JSON.parse(schemaText);
          existingData = { ...existingData, ...parsed };
        } catch (e) {
          // Ignore invalid JSON
        }
      });
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Extract common patterns
  const authorMatch = pageText.match(/(?:by|from|author:?)\s+([A-Za-z\s]+)/i);
  const dateMatch = pageText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  const priceMatch = pageText.match(/\$(\d+(?:\.\d{2})?)/);
  const ratingMatch = pageText.match(/(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*5/);
  
  // Extract FAQ patterns
  const faqMatches = pageText.match(/(?:Q:|Question:)\s*(.+?)(?:\n|A:|Answer:)\s*(.+?)(?=\n\n|\nQ:|Question:|$)/gs);
  const faqs = faqMatches ? faqMatches.map(match => {
    const parts = match.split(/(?:\n|A:|Answer:)/);
    return {
      "@type": "Question",
      "name": parts[0]?.replace(/^(?:Q:|Question:)\s*/, '').trim(),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": parts[1]?.trim()
      }
    };
  }) : [];

  // Extract HowTo steps
  const stepMatches = pageText.match(/(?:Step \d+|Step\d+|\d+\.)\s*(.+?)(?=\n(?:Step \d+|Step\d+|\d+\.)|\n\n|$)/gs);
  const steps = stepMatches ? stepMatches.map((match, index) => ({
    "@type": "HowToStep",
    "name": `Step ${index + 1}`,
    "text": match.replace(/^(?:Step \d+|Step\d+|\d+\.)\s*/, '').trim()
  })) : [];

  // Extract Recipe-specific patterns
  const recipeData = extractRecipeData(pageText);

  return {
    title,
    description,
    url,
    author: authorMatch?.[1]?.trim(),
    datePublished: dateMatch?.[1],
    price: priceMatch?.[1],
    rating: ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : undefined,
    faqs: faqs.length > 0 ? faqs : undefined,
    steps: steps.length > 0 ? steps : undefined,
    ...recipeData,
    ...existingData
  };
};

// Enhanced recipe data extraction
const extractRecipeData = (pageText: string) => {
  const recipeData: any = {};
  
  // Extract ingredients - improved pattern matching
  const ingredientPatterns = [
    /(?:ingredients?:?\s*\n|ingredients?:?\s*)([\s\S]*?)(?=\n(?:method|instructions|directions|steps|preparation|how to)|$)/i,
    /(?:ingredients?:?\s*\n)([\s\S]*?)(?=\n(?:method|instructions|directions|steps|preparation|how to)|$)/i,
    /(?:ingredients?:?\s*)([\s\S]*?)(?=\n(?:method|instructions|directions|steps|preparation|how to)|$)/i
  ];
  
  let ingredientMatches = null;
  for (const pattern of ingredientPatterns) {
    ingredientMatches = pageText.match(pattern);
    if (ingredientMatches) break;
  }
  
  if (ingredientMatches) {
    const ingredientText = ingredientMatches[1];
    const ingredients = ingredientText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(ingredients?|method|instructions?|directions?|steps?|preparation|how to)/i))
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    if (ingredients.length > 0) {
      recipeData.ingredients = ingredients;
    }
  }

  // Extract instructions/method - improved pattern matching
  const instructionPatterns = [
    /(?:method|instructions?|directions?|steps?|preparation|how to):?\s*\n([\s\S]*?)(?=\n(?:ingredients?|serves|yield|time|prep|cook)|$)/i,
    /(?:method|instructions?|directions?|steps?|preparation|how to):?\s*([\s\S]*?)(?=\n(?:ingredients?|serves|yield|time|prep|cook)|$)/i,
    /(?:method|instructions?|directions?|steps?|preparation|how to):?\s*\n([\s\S]*?)(?=\n(?:purchase|explore|articles)|$)/i
  ];
  
  let instructionMatches = null;
  for (const pattern of instructionPatterns) {
    instructionMatches = pageText.match(pattern);
    if (instructionMatches) break;
  }
  
  if (instructionMatches) {
    const instructionText = instructionMatches[1];
    const instructions = instructionText
      .split(/\n(?=\d+\.|\d+\)|step \d+|step\d+)/i)
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(method|instructions?|directions?|steps?|preparation|how to|ingredients?|serves|yield|time|prep|cook)/i))
      .map((line, index) => ({
        "@type": "HowToStep",
        "name": `Step ${index + 1}`,
        "text": line.replace(/^\d+[\.\)]\s*/, '').replace(/^step \d+:?\s*/i, '').trim()
      }))
      .filter(step => step.text.length > 0);
    
    if (instructions.length > 0) {
      recipeData.instructions = instructions;
    }
  }

  // Extract cooking times
  const prepTimeMatch = pageText.match(/(?:prep time|preparation time):?\s*(\d+)\s*(?:minutes?|mins?|hours?|hrs?)/i);
  const cookTimeMatch = pageText.match(/(?:cook time|cooking time):?\s*(\d+)\s*(?:minutes?|mins?|hours?|hrs?)/i);
  const totalTimeMatch = pageText.match(/(?:total time|total):?\s*(\d+)\s*(?:minutes?|mins?|hours?|hrs?)/i);

  if (prepTimeMatch) {
    const time = parseInt(prepTimeMatch[1]);
    const unit = prepTimeMatch[0].toLowerCase().includes('hour') ? 'H' : 'M';
    recipeData.prepTime = `PT${time}${unit}`;
  }

  if (cookTimeMatch) {
    const time = parseInt(cookTimeMatch[1]);
    const unit = cookTimeMatch[0].toLowerCase().includes('hour') ? 'H' : 'M';
    recipeData.cookTime = `PT${time}${unit}`;
  }

  if (totalTimeMatch) {
    const time = parseInt(totalTimeMatch[1]);
    const unit = totalTimeMatch[0].toLowerCase().includes('hour') ? 'H' : 'M';
    recipeData.totalTime = `PT${time}${unit}`;
  }

  // Extract servings/yield
  const servingsMatch = pageText.match(/(?:serves?|yield|makes?):?\s*(\d+)/i);
  if (servingsMatch) {
    recipeData.servings = servingsMatch[1];
    recipeData.recipeYield = servingsMatch[1];
  }

  // Extract cuisine type - improved detection
  const cuisinePatterns = [
    /(?:cuisine|type):?\s*([a-z\s]+)/i,
    /(?:indian|italian|chinese|mexican|thai|french|japanese|korean|mediterranean|american|asian|european)\s+(?:cuisine|food|recipe|dish)/i,
    /(?:curry|pasta|sushi|tacos|pad thai|ratatouille|ramen|kimchi|hummus|paella)/i
  ];
  
  let cuisineMatch = null;
  for (const pattern of cuisinePatterns) {
    cuisineMatch = pageText.match(pattern);
    if (cuisineMatch) break;
  }
  
  if (cuisineMatch) {
    let cuisine = cuisineMatch[1] || cuisineMatch[0];
    // Map common terms to standard cuisine names
    if (cuisine.toLowerCase().includes('curry')) cuisine = 'Indian';
    if (cuisine.toLowerCase().includes('pasta')) cuisine = 'Italian';
    if (cuisine.toLowerCase().includes('sushi')) cuisine = 'Japanese';
    if (cuisine.toLowerCase().includes('tacos')) cuisine = 'Mexican';
    if (cuisine.toLowerCase().includes('pad thai')) cuisine = 'Thai';
    recipeData.cuisine = cuisine.trim();
  }

  // Extract category - improved detection
  const categoryPatterns = [
    /(?:category|type):?\s*([a-z\s]+)/i,
    /(?:main course|appetizer|dessert|side dish|soup|salad|breakfast|lunch|dinner|snack)/i,
    /(?:vegetarian|vegan|gluten-free|dairy-free|keto|paleo)/i
  ];
  
  let categoryMatch = null;
  for (const pattern of categoryPatterns) {
    categoryMatch = pageText.match(pattern);
    if (categoryMatch) break;
  }
  
  if (categoryMatch) {
    let category = categoryMatch[1] || categoryMatch[0];
    // Map common terms to standard categories
    if (category.toLowerCase().includes('curry') || category.toLowerCase().includes('vegetable')) category = 'Main Course';
    if (category.toLowerCase().includes('soup')) category = 'Soup';
    if (category.toLowerCase().includes('salad')) category = 'Salad';
    if (category.toLowerCase().includes('dessert')) category = 'Dessert';
    recipeData.category = category.trim();
  }

  // Extract difficulty
  const difficultyMatch = pageText.match(/(?:difficulty|level):?\s*(easy|medium|hard|beginner|intermediate|advanced)/i);
  if (difficultyMatch) {
    recipeData.difficulty = difficultyMatch[1].charAt(0).toUpperCase() + difficultyMatch[1].slice(1);
  }

  // Extract keywords/tags
  const keywordMatches = pageText.match(/(?:tags?|keywords?):?\s*([^.\n]+)/i);
  if (keywordMatches) {
    const keywords = keywordMatches[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
    recipeData.keywords = keywords.join(', ');
    recipeData.tags = keywords;
  }

  // Extract nutrition information
  const nutritionData: any = {};
  const caloriesMatch = pageText.match(/(?:calories?):?\s*(\d+)/i);
  const fatMatch = pageText.match(/(?:fat):?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)/i);
  const proteinMatch = pageText.match(/(?:protein):?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)/i);
  const carbsMatch = pageText.match(/(?:carbs?|carbohydrates?):?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)/i);

  if (caloriesMatch) nutritionData.calories = `${caloriesMatch[1]} calories`;
  if (fatMatch) nutritionData.fatContent = `${fatMatch[1]}g`;
  if (proteinMatch) nutritionData.proteinContent = `${proteinMatch[1]}g`;
  if (carbsMatch) nutritionData.carbohydrateContent = `${carbsMatch[1]}g`;

  if (Object.keys(nutritionData).length > 0) {
    recipeData.nutrition = nutritionData;
  }

  // Extract images (look for common image patterns)
  const imageMatches = pageText.match(/(?:image|photo|picture):?\s*([^\s\n]+\.(?:jpg|jpeg|png|gif|webp))/gi);
  if (imageMatches) {
    recipeData.image = imageMatches.map(match => match.replace(/^(?:image|photo|picture):?\s*/i, ''));
  }

  // Extract video information
  const videoMatches = pageText.match(/(?:video|youtube|vimeo):?\s*([^\s\n]+)/gi);
  if (videoMatches) {
    const videoUrl = videoMatches[0].replace(/^(?:video|youtube|vimeo):?\s*/i, '');
    recipeData.video = {
      contentUrl: videoUrl,
      embedUrl: videoUrl,
      name: recipeData.title || "Recipe Video"
    };
  }

  return recipeData;
};

// Generate multiple schemas using templates
export const generateMultipleSchemasFromTemplates = async (
  schemaTypes: string[],
  content: any,
  websiteInfo: WebsiteInfo
): Promise<RecommendedSchema[]> => {
  const schemas: RecommendedSchema[] = [];
  
  for (const schemaType of schemaTypes.slice(0, 3)) { // Limit to 3 schemas
    try {
      const schema = await generateSchemaFromTemplate(schemaType, content, websiteInfo);
      schemas.push(schema);
    } catch (error) {
      console.warn(`Failed to generate ${schemaType} schema from template:`, error);
    }
  }
  
  return schemas;
};
