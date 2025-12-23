# GST Auto-Fill Quick Start Guide

## ✅ What's Been Implemented

Your ERP now has **automatic GST verification and party detail auto-fill** functionality!

## 🚀 How to Use (Right Now)

### Without API Configuration (Works Immediately)

1. Open your app: `http://localhost:5173`
2. Go to **Party Master** → Click **"Add Customer"**
3. Enter any valid GSTIN (e.g., `24AABCU9603R1ZM`)
4. Click **"Verify"** button
5. System will automatically fill:
   - ✅ PAN Number (extracted from GSTIN)
   - ✅ State (extracted from GSTIN state code)

### With API Configuration (Full Auto-Fill)

To get **complete business details** (company name, address, etc.):

1. **Quick Setup (5 minutes)**:
   ```bash
   # 1. Copy environment template
   cp .env.example .env.local
   
   # 2. Sign up for free GST API (recommended: Sandbox.co.in)
   # Visit: https://sandbox.co.in/gst
   # Get your API key
   
   # 3. Edit .env.local and add:
   VITE_GST_API_ENDPOINT=https://api.sandbox.co.in/gst/v1
   VITE_GST_API_KEY=your_api_key_here
   
   # 4. Restart dev server
   npm run dev
   ```

2. **Now when you click "Verify"**, it will auto-fill:
   - ✅ Company/Trade Name
   - ✅ Legal Name
   - ✅ PAN Number
   - ✅ GST Registration Date
   - ✅ Complete Address
   - ✅ State
   - ✅ District
   - ✅ City/Location
   - ✅ Pincode
   - ✅ Registration Type

## 📋 Test GSTINs

Use these for testing:

```
24AABCU9603R1ZM  → Gujarat (Regular)
27AAPFU0939F1ZV  → Maharashtra (Regular)
29AAACR5055K1Z5  → Karnataka (Regular)
07AAACR5055K1ZX  → Delhi (Regular)
```

## 🎯 What Happens When You Click "Verify"

### Scenario 1: API Configured ✅
```
Enter GSTIN → Click Verify → API Call → Auto-fill ALL fields → Success!
```

### Scenario 2: No API (Fallback) ⚡
```
Enter GSTIN → Click Verify → Extract PAN & State → Auto-fill basic info → Warning message
```

### Scenario 3: Invalid GSTIN ❌
```
Enter invalid GSTIN → Click Verify → Error message → No auto-fill
```

## 📁 Files Created

1. **`src/services/gstApi.ts`** - GST API integration service
2. **`src/components/parties/PartyDialog.tsx`** - Updated with auto-fill logic
3. **`.env.example`** - Environment variable template
4. **`docs/GST_API_SETUP.md`** - Complete documentation

## 🔧 Recommended GST API Providers

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Sandbox.co.in** | 100/month | Testing & Development |
| **MasterGST** | 100/month | Production (Most reliable) |
| **GST API** | 50/month | Small businesses |

## 💡 Pro Tips

1. **Start with Sandbox.co.in** - Free 100 requests/month, perfect for testing
2. **Upgrade to MasterGST** - When going to production for better reliability
3. **Cache verified GSTINs** - Save API calls by storing verified data
4. **Always validate** - Even with auto-fill, review data before saving

## 🐛 Troubleshooting

**"Invalid GSTIN format"**
- Ensure exactly 15 characters
- All uppercase
- Follow format: `22AAAAA0000A1Z5`

**"Could not fetch complete details"**
- API not configured → Only PAN & State will be filled
- Check `.env.local` has correct credentials
- Restart dev server after adding credentials

**"Failed to verify GSTIN"**
- Check internet connection
- Verify API key is valid
- Check API rate limits

## 📖 Full Documentation

For detailed setup instructions, see: `docs/GST_API_SETUP.md`

## 🎉 Next Steps

1. **Test it now** - Try adding a party with GSTIN verification
2. **Configure API** - Sign up for Sandbox.co.in (5 minutes)
3. **Go live** - Upgrade to paid API for production

---

**Need Help?** Check the full documentation or the code comments in `src/services/gstApi.ts`
