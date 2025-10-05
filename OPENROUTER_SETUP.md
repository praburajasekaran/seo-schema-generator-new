# OpenRouter Setup Guide

This project now uses **OpenRouter** for AI-powered schema generation, providing access to multiple AI models through a single unified API.

## 🎯 Why OpenRouter?

- **Single API Key**: Access GPT-4o-mini, Gemini Flash, Mistral Small, and more with one key
- **Cost Effective**: ~$0.21 per 1,000 schemas with automatic fallback
- **High Reliability**: If one model fails, automatically falls back to the next
- **Simple Billing**: One invoice for all AI providers
- **Free Credits**: $5 free credits to get started

## 🚀 Quick Setup

### Step 1: Get Your OpenRouter API Key

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Navigate to [https://openrouter.ai/keys](https://openrouter.ai/keys)
4. Click "Create Key"
5. Copy your API key (starts with `sk-or-v1-`)

### Step 2: Add API Key to Your Project

Create a `.env` file in the project root:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

### Step 3: Run the Application

```bash
npm run dev
```

That's it! The app will now use OpenRouter's Quality-First Stack.

## 📊 Provider Stack (Option 2: Quality-First)

The application uses an intelligent fallback system:

| Priority | Model | Provider | Cost/1K | When Used |
|----------|-------|----------|---------|-----------|
| 1️⃣ Primary | GPT-4o-mini | OpenAI | $0.21 | Always tried first |
| 2️⃣ Fallback 1 | Gemini 2.0 Flash | Google | $0.11 | If GPT-4o-mini fails |
| 3️⃣ Fallback 2 | Mistral Small | Mistral AI | $0.25 | If Gemini fails |

**Expected Cost**: ~$0.21/1K schemas (95%+ requests use GPT-4o-mini)

## 🔧 Model Selection

### Why GPT-4o-mini as Primary?

- ✅ Best structured JSON output quality
- ✅ Excellent at following complex instructions
- ✅ Strong schema.org knowledge
- ✅ Reliable JSON mode support
- ✅ Still 94% cheaper than GPT-4o

### Why Gemini Flash as Fallback 1?

- ✅ Cheapest option at $0.11/1K
- ✅ Very fast response times
- ✅ Good JSON generation
- ✅ Native Google AI integration

### Why Mistral Small as Fallback 2?

- ✅ Diverse reasoning approach
- ✅ Good at edge cases
- ✅ EU data residency option
- ✅ Similar cost to primary

## 💰 Cost Breakdown

### Per Schema Generation:
- Input: ~8,000 tokens (webpage text + context)
- Output: ~1,500 tokens (generated schemas)

### With GPT-4o-mini:
```
Input:  8K tokens × $0.15/M = $0.0012
Output: 1.5K tokens × $0.60/M = $0.0009
Total: $0.0021 per schema = $0.21 per 1K schemas
```

### Comparison to Alternatives:
| Service | Cost/1K Schemas | Notes |
|---------|-----------------|-------|
| **OpenRouter (GPT-4o-mini)** | **$0.21** | ⭐ Current implementation |
| Direct Gemini Flash | $0.11 | Requires separate API key |
| Direct GPT-4o | $3.50 | 16x more expensive |
| Direct GPT-3.5 | $0.63 | 3x more expensive |
| Open Source Self-Hosted | $0.50-2/hr | + DevOps overhead |

## 🔐 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use environment variables** in production (Netlify, Vercel, etc.)
3. **Rotate keys regularly** if exposed
4. **Monitor usage** on OpenRouter dashboard
5. **Set spending limits** in OpenRouter settings

## 🧪 Testing Your Setup

After setup, test the integration:

```bash
# Run the development server
npm run dev

# Test schema generation:
# 1. Open http://localhost:5173
# 2. Enter a URL (e.g., https://example.com)
# 3. Click "Generate Schemas"
# 4. Check console for provider used
```

Look for this in the console:
```
🚀 Starting OpenRouter schema generation (Quality-First Stack)
📊 Detected schema types: ['BlogPosting', 'Organization']
🔄 Attempting schema generation with GPT-4o-mini (Primary) ($0.21/1K)
✅ Successfully generated 2 schemas with GPT-4o-mini (Primary)
```

## 🐛 Troubleshooting

### Error: "OPENROUTER_API_KEY environment variable not set"

**Solution**: Make sure your `.env` file exists and contains:
```bash
OPENROUTER_API_KEY=sk-or-v1-your-actual-key
```

### Error: "Invalid API key"

**Solution**: 
1. Verify your key starts with `sk-or-v1-`
2. Check for extra spaces or newlines
3. Generate a new key at [openrouter.ai/keys](https://openrouter.ai/keys)

### Error: "All AI providers failed"

**Solution**:
1. Check your OpenRouter balance at [openrouter.ai/activity](https://openrouter.ai/activity)
2. Verify you have credits remaining
3. Check OpenRouter status at [status.openrouter.ai](https://status.openrouter.ai)

### Schemas not generating properly

**Solution**:
1. Check browser console for errors
2. Verify the URL is accessible
3. Try the "Manual Content Input" option
4. Check if site is blocking scrapers (Cloudflare, etc.)

## 📈 Monitoring Usage

Track your usage on the OpenRouter dashboard:

1. Go to [https://openrouter.ai/activity](https://openrouter.ai/activity)
2. View requests per model
3. See cost breakdown
4. Monitor error rates
5. Set spending alerts

## 🔄 Migration from Legacy APIs

If you were using the old setup with direct Gemini/OpenAI keys:

### Before (Legacy):
```bash
API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

### After (OpenRouter):
```bash
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
```

The old keys are no longer needed! OpenRouter handles everything.

## 🎯 Production Deployment

### Netlify

1. Go to Site Settings → Environment Variables
2. Add: `OPENROUTER_API_KEY` = `sk-or-v1-your-key`
3. Redeploy

### Vercel

1. Go to Project Settings → Environment Variables
2. Add: `OPENROUTER_API_KEY` = `sk-or-v1-your-key`
3. Redeploy

### Other Platforms

Set the `OPENROUTER_API_KEY` environment variable in your platform's configuration.

## 🆘 Support

- **OpenRouter Docs**: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- **OpenRouter Discord**: [https://discord.gg/openrouter](https://discord.gg/openrouter)
- **Project Issues**: [GitHub Issues](https://github.com/your-repo/issues)

## 📚 Additional Resources

- [OpenRouter Model Pricing](https://openrouter.ai/models)
- [OpenRouter API Reference](https://openrouter.ai/docs/api)
- [Schema.org Documentation](https://schema.org)
- [JSON-LD Playground](https://json-ld.org/playground/)

---

Made with ❤️ by [Paretoid Marketing LLP](https://paretoid.com/)

