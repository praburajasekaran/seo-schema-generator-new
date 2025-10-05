# SEO Schema Generator

A powerful tool that analyzes web pages and generates relevant JSON-LD schemas for better SEO. Built with React, TypeScript, and powered by OpenRouter for access to multiple AI providers.

## ✨ Features

- **Smart Content Analysis**: Automatically detects content types and suggests appropriate schemas
- **Multi-Provider AI**: Uses OpenRouter with intelligent fallback stack (GPT-4o-mini → Gemini Flash → Mistral Small)
- **Cost Optimized**: Quality-first approach with ~$0.21 per 1,000 schemas generated
- **Zero Configuration**: Works out of the box - just add your OpenRouter API key
- **Comprehensive Schema Support**: Generates schemas for Articles, Products, FAQs, How-tos, Local Business, Events, and more
- **Predictable Results**: Consistent schema generation with intelligent fallbacks
- **Real-time Validation**: Validates generated schemas against schema.org standards
- **Essential Site Schemas**: Generates Organization and WebSite schemas for your brand
- **Breadcrumb Detection**: Automatically extracts and generates breadcrumb schemas
- **Copy & Paste Ready**: Get properly formatted JSON-LD code ready for your website
- **Beautiful UI**: Clean, responsive design that's easy to use

## 🚀 Live Demo

[Deployed on Netlify](https://your-app-name.netlify.app) (coming soon)

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **AI**: OpenRouter (GPT-4o-mini, Gemini 2.5 Flash, Mistral Small)
- **Styling**: Tailwind CSS
- **Deployment**: Netlify

## 📦 Installation

**Prerequisites:** Node.js 18+

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/seo-schema-generator.git
   cd seo-schema-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   
   Create a `.env` file in the root directory:
   ```bash
   # Required - OpenRouter API Key (provides access to multiple AI models)
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   
   # Legacy - Google Gemini API Key (only for direct Gemini access)
   # API_KEY=your_gemini_api_key_here
   ```
   
   **Get your OpenRouter API key:**
   - OpenRouter: [https://openrouter.ai/keys](https://openrouter.ai/keys)
   - Sign up for a free account and get $5 in free credits
   - OpenRouter provides unified access to GPT-4o-mini, Gemini Flash, Mistral Small, and more!

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 Usage

1. **Set up your website profile** with company information, logo, and author details
2. **Paste any URL** you want to analyze
3. **Get instant schema recommendations** based on the page content
4. **Copy the generated JSON-LD** and paste it into your website's `<head>` section
5. **Test with Google** using the provided validation links

## 📋 Supported Schema Types

- **Content**: BlogPosting, NewsArticle, Article
- **E-commerce**: Product, Offer
- **Recipes**: Recipe
- **FAQ**: FAQPage
- **Tutorials**: HowTo
- **Business**: LocalBusiness, Restaurant, Store
- **Events**: Event
- **Reviews**: Review, AggregateRating
- **Structure**: BreadcrumbList, Organization, WebSite

## 🚀 Deployment

### Netlify (Recommended)

1. Fork this repository
2. Connect your GitHub account to Netlify
3. Set the build command: `npm run build`
4. Set the publish directory: `dist`
5. Add environment variable:
   - `OPENROUTER_API_KEY` (required - get from [openrouter.ai/keys](https://openrouter.ai/keys))
6. Deploy!

### Other Platforms

The app can be deployed to any platform that supports static sites:
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💰 Cost Efficiency

This app uses OpenRouter's **Quality-First Stack** for optimal cost-performance:

| Provider | Cost per 1K schemas | Role |
|----------|---------------------|------|
| GPT-4o-mini | ~$0.21 | Primary (best structured output) |
| Gemini 2.0 Flash | ~$0.11 | Fallback 1 (fastest & cheapest) |
| Mistral Small | ~$0.25 | Fallback 2 (diverse reasoning) |

**Average cost: ~$0.21 per 1,000 schemas** with automatic fallback for maximum reliability.

## 🙏 Acknowledgments

- Powered by [OpenRouter](https://openrouter.ai/) - unified API for multiple AI providers
- Models: GPT-4o-mini (OpenAI), Gemini 2.5 Flash (Google), Mistral Small (Mistral AI)
- UI design inspired by modern design principles
- Schema validation powered by [schema.org](https://schema.org/)

---

Made with ❤️ by [Paretoid Marketing LLP](https://paretoid.com/)
