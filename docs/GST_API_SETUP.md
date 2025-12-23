# GST API Integration Guide

This document explains how to set up and use the GST API integration for automatic party detail fetching.

## 🎯 Features

When you enter a GSTIN in the "Add Party" dialog and click "Verify", the system will:

1. ✅ **Validate GSTIN format** (15 characters, proper structure)
2. ✅ **Extract PAN** from GSTIN (characters 3-12)
3. ✅ **Extract State** from GSTIN (first 2 digits = state code)
4. ✅ **Fetch complete business details** from GST API (if configured)
5. ✅ **Auto-fill form fields**:
   - Company/Trade Name
   - Legal Name
   - PAN Number
   - GST Registration Date
   - Complete Address
   - State
   - District
   - City/Location
   - Pincode
   - Registration Type (Regular/Composition)

## 🔧 Setup Instructions

### Option 1: Using Third-Party GST API (Recommended)

#### Step 1: Choose a GST API Provider

Select one of these popular providers:

| Provider | Free Tier | Pricing | Reliability | Link |
|----------|-----------|---------|-------------|------|
| **MasterGST** | 100 requests/month | ₹500/month for 1000 requests | ⭐⭐⭐⭐⭐ | [mastergst.com](https://mastergst.com/) |
| **GST API** | 50 requests/month | ₹1000/month for 2000 requests | ⭐⭐⭐⭐ | [gstapi.charteredinfo.com](https://gstapi.charteredinfo.com/) |
| **KnowYourGST** | Trial available | ₹750/month | ⭐⭐⭐⭐ | [knowyourgst.com](https://knowyourgst.com/) |
| **GST Zen** | 25 requests/month | ₹600/month | ⭐⭐⭐ | [gstzen.in](https://gstzen.in/) |
| **Sandbox.co.in** | 100 requests/month | Free for testing | ⭐⭐⭐ | [sandbox.co.in/gst](https://sandbox.co.in/gst) |

#### Step 2: Sign Up and Get API Credentials

1. Visit your chosen provider's website
2. Sign up for an account
3. Navigate to API section in dashboard
4. Copy your **API Key** and **API Endpoint**

#### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   VITE_GST_API_ENDPOINT=https://api.mastergst.com/v1
   VITE_GST_API_KEY=your_actual_api_key_here
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

#### Step 4: Update API Integration (if needed)

The default integration in `src/services/gstApi.ts` uses a generic structure. You may need to adjust the response mapping based on your provider's API response format.

**Example for MasterGST:**
```typescript
// In fetchFromThirdPartyAPI function
const response = await fetch(`${API_ENDPOINT}/gstin/${gstin}`, {
  method: 'GET',
  headers: {
    'username': 'your_username',
    'password': 'your_password',
    'Content-Type': 'application/json',
  },
});
```

**Example for Sandbox.co.in:**
```typescript
const response = await fetch(`https://api.sandbox.co.in/gst/v1/gstin/${gstin}`, {
  method: 'GET',
  headers: {
    'x-api-key': API_KEY,
    'x-api-version': '1.0',
    'Content-Type': 'application/json',
  },
});
```

### Option 2: Using Fallback Mode (No API Required)

If you don't configure a GST API, the system will still work with **basic extraction**:

- ✅ Extracts PAN from GSTIN
- ✅ Extracts State from GSTIN
- ⚠️ Other fields must be entered manually

This is useful for:
- Development/testing
- Low-budget scenarios
- Backup when API is down

## 📝 Usage

### In the Application

1. Open **Party Master** → Click **"Add Customer"**
2. Enter the **GSTIN** (15 characters)
3. Click **"Verify"** button next to GSTIN field
4. Wait for verification (usually 1-3 seconds)
5. Form fields will auto-fill with fetched data
6. Review and edit if needed
7. Click **"Save"**

### Example GSTIN for Testing

```
24AABCU9603R1ZM  (Gujarat - Regular)
27AAPFU0939F1ZV  (Maharashtra - Regular)
29AAACR5055K1Z5  (Karnataka - Regular)
```

## 🔍 How It Works

### GSTIN Structure
```
22 AAAAA 0000 A 1 Z 5
│  │     │    │ │ │ └─ Check digit
│  │     │    │ │ └─── Default 'Z'
│  │     │    │ └───── Entity number (1-9, A-Z)
│  │     │    └─────── PAN check digit
│  │     └──────────── PAN sequence (4 digits)
│  └────────────────── PAN entity type (5 chars)
└───────────────────── State code (2 digits)
```

### Validation Process

1. **Format Check**: Validates 15-character format
2. **Regex Validation**: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
3. **State Code**: First 2 digits must be valid state code (01-38)
4. **PAN Extraction**: Characters 3-12 must form valid PAN

### API Flow

```
User enters GSTIN
      ↓
Validate format
      ↓
Call GST API (with retry)
      ↓
Parse response
      ↓
Transform to standard format
      ↓
Auto-fill form fields
      ↓
Show success message
```

### Fallback Mechanism

```
Try Third-Party API
      ↓
   Failed?
      ↓
Extract basic info from GSTIN
      ↓
Fill PAN and State
      ↓
Show warning message
```

## 🛠️ Customization

### Adding a New API Provider

1. Open `src/services/gstApi.ts`
2. Add a new function:
   ```typescript
   async function fetchFromYourProvider(gstin: string): Promise<GSTApiResponse> {
     // Your implementation
   }
   ```
3. Update `fetchGSTDetails` to try your provider first

### Customizing Auto-Fill Behavior

Edit `handleVerifyGst` in `src/components/parties/PartyDialog.tsx`:

```typescript
// Example: Don't auto-fill company name
// Comment out these lines:
// if (gstData.tradeName || gstData.legalName) {
//   form.setValue('name', companyName);
// }
```

### Adding Additional Fields

If your API provides more data (like email, phone), you can map them:

```typescript
if (gstData.email) {
  form.setValue('email', gstData.email);
}

if (gstData.phone) {
  form.setValue('mobile', gstData.phone);
}
```

## 🐛 Troubleshooting

### Issue: "Invalid GSTIN format" error

**Solution**: Ensure GSTIN is exactly 15 characters and follows the format.

### Issue: "GST API credentials not configured"

**Solution**: 
1. Check `.env.local` exists
2. Verify `VITE_GST_API_KEY` and `VITE_GST_API_ENDPOINT` are set
3. Restart dev server

### Issue: "Failed to verify GSTIN"

**Possible causes**:
1. API rate limit exceeded
2. Invalid API credentials
3. Network error
4. GSTIN not found in GST database

**Solution**: Check browser console for detailed error. System will fallback to basic extraction.

### Issue: Wrong data auto-filled

**Solution**: 
1. Verify GSTIN is correct
2. Check if API response format matches your provider
3. Update response mapping in `fetchFromThirdPartyAPI`

## 📊 API Response Examples

### MasterGST Response
```json
{
  "gstin": "24AABCU9603R1ZM",
  "legalName": "ABC PRIVATE LIMITED",
  "tradeName": "ABC Pvt Ltd",
  "registrationDate": "01/07/2017",
  "status": "Active",
  "pradr": {
    "bno": "123",
    "st": "Main Street",
    "loc": "Ahmedabad",
    "dst": "Ahmedabad",
    "stcd": "24",
    "pncd": "380001"
  }
}
```

### Sandbox.co.in Response
```json
{
  "data": {
    "gstin": "24AABCU9603R1ZM",
    "legal_name": "ABC PRIVATE LIMITED",
    "trade_name": "ABC Pvt Ltd",
    "registration_date": "2017-07-01",
    "taxpayer_type": "Regular",
    "status": "Active",
    "principal_place_of_business": {
      "address_line1": "123 Main Street",
      "city": "Ahmedabad",
      "district": "Ahmedabad",
      "state": "Gujarat",
      "pincode": "380001"
    }
  }
}
```

## 🔐 Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Use environment variables** for API keys
3. **Implement rate limiting** on client side
4. **Cache GST data** to reduce API calls
5. **Validate all data** before saving to database
6. **Use HTTPS** for all API calls
7. **Rotate API keys** periodically

## 💡 Tips

1. **Free Tier**: Start with Sandbox.co.in for testing
2. **Production**: Use MasterGST or GST API for reliability
3. **Caching**: Consider caching verified GSTINs in your database
4. **Batch Processing**: Some providers offer bulk GSTIN verification
5. **Error Handling**: Always have fallback to manual entry

## 📞 Support

For issues with:
- **GST API Service**: Contact your API provider
- **Integration Code**: Check `src/services/gstApi.ts`
- **Form Auto-fill**: Check `src/components/parties/PartyDialog.tsx`

## 🔄 Updates

To update the GST API integration:

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Restart server
npm run dev
```

---

**Last Updated**: 2025-12-16
**Version**: 1.0.0
