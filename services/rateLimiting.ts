/**
 * Rate limiting and retry utilities for web scraping
 */

interface RateLimitInfo {
  lastRequestTime: number;
  requestCount: number;
  windowStart: number;
  isRateLimited: boolean;
  backoffUntil?: number;
}

// Track rate limiting per domain
const rateLimitTracker = new Map<string, RateLimitInfo>();

/**
 * Check if we're currently rate limited for a domain
 */
export const isRateLimited = (url: string): boolean => {
  try {
    const domain = new URL(url).hostname;
    const info = rateLimitTracker.get(domain);
    
    if (!info) return false;
    
    // Check if we're in a backoff period
    if (info.backoffUntil && Date.now() < info.backoffUntil) {
      return true;
    }
    
    // Reset backoff if it's expired
    if (info.backoffUntil && Date.now() >= info.backoffUntil) {
      info.backoffUntil = undefined;
      info.isRateLimited = false;
    }
    
    return info.isRateLimited;
  } catch {
    return false;
  }
};

/**
 * Record a successful request
 */
export const recordSuccessfulRequest = (url: string): void => {
  try {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const info = rateLimitTracker.get(domain) || {
      lastRequestTime: 0,
      requestCount: 0,
      windowStart: now,
      isRateLimited: false
    };
    
    info.lastRequestTime = now;
    info.requestCount++;
    
    // Reset window every 60 seconds
    if (now - info.windowStart > 60000) {
      info.requestCount = 1;
      info.windowStart = now;
    }
    
    rateLimitTracker.set(domain, info);
  } catch {
    // Ignore errors
  }
};

/**
 * Record a rate limit response and set backoff
 */
export const recordRateLimit = (url: string, retryAfter?: number): void => {
  try {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const info = rateLimitTracker.get(domain) || {
      lastRequestTime: 0,
      requestCount: 0,
      windowStart: now,
      isRateLimited: false
    };
    
    info.isRateLimited = true;
    
    // Set backoff period
    if (retryAfter) {
      info.backoffUntil = now + (retryAfter * 1000);
    } else {
      // Exponential backoff: 30s, 60s, 120s, etc.
      const backoffSeconds = Math.min(30 * Math.pow(2, info.requestCount), 300);
      info.backoffUntil = now + (backoffSeconds * 1000);
    }
    
    rateLimitTracker.set(domain, info);
    
    console.warn(`Rate limited for ${domain}. Backoff until: ${new Date(info.backoffUntil).toISOString()}`);
  } catch {
    // Ignore errors
  }
};

/**
 * Get the delay before the next request for a domain
 */
export const getRequestDelay = (url: string): number => {
  try {
    const domain = new URL(url).hostname;
    const info = rateLimitTracker.get(domain);
    
    if (!info) {
      // No history, use minimal delay for first request (0.5-1.5 seconds)
      return Math.random() * 1000 + 500;
    }
    
    // If rate limited, return time until backoff ends
    if (info.backoffUntil && Date.now() < info.backoffUntil) {
      return info.backoffUntil - Date.now();
    }
    
    // Adaptive delay based on request frequency
    const timeSinceLastRequest = Date.now() - info.lastRequestTime;
    const requestsPerMinute = info.requestCount / ((Date.now() - info.windowStart) / 60000);
    
    if (requestsPerMinute > 10) {
      // High frequency, use longer delay (2-3 seconds)
      return Math.random() * 1000 + 2000;
    } else if (requestsPerMinute > 5) {
      // Medium frequency, use medium delay (1-2 seconds)
      return Math.random() * 1000 + 1000;
    } else {
      // Low frequency, use short delay (0.5-1.5 seconds)
      return Math.random() * 1000 + 500;
    }
  } catch {
    // Fallback to random delay
    return Math.random() * 2000 + 1000;
  }
};

/**
 * Check if a response indicates rate limiting
 */
export const isRateLimitResponse = (response: Response): boolean => {
  return response.status === 429 || 
         response.status === 503 ||
         response.headers.get('retry-after') !== null ||
         response.headers.get('x-ratelimit-remaining') === '0';
};

/**
 * Extract retry-after value from response headers
 */
export const getRetryAfter = (response: Response): number | null => {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? null : seconds;
  }
  return null;
};

/**
 * Clear rate limit tracking for a domain (useful for testing)
 */
export const clearRateLimit = (url: string): void => {
  try {
    const domain = new URL(url).hostname;
    rateLimitTracker.delete(domain);
  } catch {
    // Ignore errors
  }
};

/**
 * Get current rate limit status for debugging
 */
export const getRateLimitStatus = (url: string): RateLimitInfo | null => {
  try {
    const domain = new URL(url).hostname;
    return rateLimitTracker.get(domain) || null;
  } catch {
    return null;
  }
};
