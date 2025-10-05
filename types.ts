// Image import declarations
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

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
  isLightLogo?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}
