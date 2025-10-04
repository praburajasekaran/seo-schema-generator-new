# SEO Schema Generator

A powerful tool that analyzes web pages and generates relevant JSON-LD schemas for better SEO. Built with React, TypeScript, and Google's Gemini AI.

## ✨ Features

- **Smart Content Analysis**: Automatically detects content types and suggests appropriate schemas
- **Comprehensive Schema Support**: Generates schemas for Articles, Products, FAQs, How-tos, Local Business, Events, and more
- **Predictable Results**: Consistent schema generation with intelligent fallbacks
- **Real-time Validation**: Validates generated schemas against schema.org standards
- **Essential Site Schemas**: Generates Organization and WebSite schemas for your brand
- **Breadcrumb Detection**: Automatically extracts and generates breadcrumb schemas
- **Copy & Paste Ready**: Get properly formatted JSON-LD code ready for your website
- **Dark/Light Mode**: Beautiful, responsive design with theme switching

## 🚀 Live Demo

[Deployed on Netlify](https://your-app-name.netlify.app) (coming soon)

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **AI**: Google Gemini 2.5 Flash
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
   ```bash
   cp .env.local.example .env.local
   ```
   
   Add your Gemini API key to `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

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
5. Add environment variable: `GEMINI_API_KEY`
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

## 🙏 Acknowledgments

- Built with [Google Gemini AI](https://ai.google.dev/)
- UI design inspired by modern design principles
- Schema validation powered by [schema.org](https://schema.org/)

---

Made with ❤️ by [Paretoid Marketing LLP](https://paretoid.com/)
