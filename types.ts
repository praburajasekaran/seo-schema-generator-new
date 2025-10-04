export interface RecommendedSchema {
  schemaType: string;
  description: string;
  jsonLd: string;
  validationStatus: 'valid' | 'invalid';
  validationError?: string;
}

export interface GeminiApiResponse {
  schemas: {
    schemaType: string;
    description: string;
    jsonLd: string;
  }[];
}

export interface WebsiteInfo {
  companyName: string;
  founderName: string;
  companyLogoUrl: string;
}

export interface WebsiteProfile extends WebsiteInfo {
  id: string;
  profileName: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}
