# Receipt OCR Implementation Guide 📸

## OCR Service Comparison

| Service | Accuracy | Cost | Setup Difficulty | Best For |
|---------|----------|------|------------------|----------|
| **Mindee** | ⭐⭐⭐⭐⭐ | Free tier: 250/month<br>Then $0.04/page | ⭐ Easy | **Recommended** - Built for receipts |
| **Veryfi** | ⭐⭐⭐⭐⭐ | Free tier: 100/month<br>Then $0.50/receipt | ⭐⭐ Medium | High accuracy, pricier |
| **Google Vision** | ⭐⭐⭐⭐ | $1.50/1000 images | ⭐⭐⭐ Hard | If already using Google Cloud |
| **Nanonets** | ⭐⭐⭐⭐ | Free tier: 100/month<br>Then $0.30/receipt | ⭐⭐ Medium | Custom training available |
| **Azure Form Recognizer** | ⭐⭐⭐⭐ | $1.50/1000 pages | ⭐⭐⭐ Hard | If already using Azure |

**My Recommendation: Mindee** ✅
- Specifically built for receipts (best accuracy)
- Easiest API
- Generous free tier (250/month)
- Affordable paid tier
- Great documentation

---

## Option 1: Mindee (Recommended) ⭐

### Setup (5 minutes)

**1. Create Account**
```
1. Go to https://platform.mindee.com
2. Sign up (free)
3. Verify email
```

**2. Get API Key**
```
1. Dashboard → API Keys
2. Create new key
3. Copy the key (starts with "mindee_api_...")
```

**3. Install SDK**
```bash
npm install mindee
```

**4. Add to Environment Variables**
```bash
# .env.local
MINDEE_API_KEY=your_mindee_api_key_here
```

### Implementation

**API Route: `app/api/ocr/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import * as mindee from 'mindee'

// Initialize Mindee client
const mindeeClient = new mindee.Client({ 
  apiKey: process.env.MINDEE_API_KEY! 
})

export async function POST(request: Request) {
  try {
    const { imageBase64, imageUrl } = await request.json()
    
    let inputSource
    
    // Support both base64 and URL inputs
    if (imageBase64) {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      inputSource = mindeeClient.docFromBase64(base64Data, 'receipt.jpg')
    } else if (imageUrl) {
      inputSource = mindeeClient.docFromUrl(imageUrl)
    } else {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }
    
    // Parse receipt with Mindee's receipt model
    const apiResponse = await mindeeClient.parse(
      mindee.product.ReceiptV5,
      inputSource
    )
    
    const receipt = apiResponse.document.inference.prediction
    
    // Extract items
    const items = receipt.lineItems.map((item: any) => ({
      name: item.description || 'Unknown Item',
      price: item.totalAmount || 0,
      quantity: item.quantity || 1
    })).filter((item: any) => item.price > 0) // Remove items with no price
    
    // Calculate tax and tip from receipt totals
    const subtotal = receipt.totalNet?.value || 0
    const tax = receipt.totalTax?.value || 0
    const total = receipt.totalAmount?.value || 0
    
    // Calculate tip (if present on receipt)
    const tip = receipt.tip?.value || (total - subtotal - tax)
    
    // Calculate percentages
    const taxPercent = subtotal > 0 ? (tax / subtotal) * 100 : 0
    const tipPercent = subtotal > 0 ? (tip / subtotal) * 100 : 0
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        tip: parseFloat(tip.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        taxPercent: parseFloat(taxPercent.toFixed(2)),
        tipPercent: parseFloat(tipPercent.toFixed(2)),
        // Additional metadata
        date: receipt.date?.value,
        merchant: receipt.supplierName?.value,
        category: receipt.category?.value
      }
    })
    
  } catch (error: any) {
    console.error('OCR Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process receipt',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
```

### Client-Side Usage

**Component: `components/ReceiptUpload.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'

interface OCRResult {
  items: Array<{ name: string; price: number; quantity: number }>
  subtotal: number
  tax: number
  tip: number
  total: number
  taxPercent: number
  tipPercent: number
  date?: string
  merchant?: string
}

export default function ReceiptUpload({ 
  onOCRComplete 
}: { 
  onOCRComplete: (result: OCRResult) => void 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setError(null)
    setIsAnalyzing(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Convert to base64 for API
      const base64 = await fileToBase64(file)

      // Call OCR API
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      })

      if (!response.ok) {
        throw new Error('OCR failed')
      }

      const result = await response.json()
      
      if (result.success) {
        onOCRComplete(result.data)
      } else {
        throw new Error(result.error)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to analyze receipt')
      console.error('Upload error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={isAnalyzing}
          className="hidden"
          id="receipt-upload"
        />
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 
                     hover:border-purple-500 transition cursor-pointer
                     flex flex-col items-center justify-center
                     min-h-[200px] relative overflow-hidden"
        >
          {preview ? (
            <img 
              src={preview} 
              alt="Receipt preview" 
              className="max-h-[300px] rounded-lg"
            />
          ) : (
            <>
              <Upload size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-600 font-semibold mb-2">
                Click to upload receipt
              </p>
              <p className="text-gray-400 text-sm">
                PNG, JPG up to 5MB
              </p>
            </>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm 
                          flex flex-col items-center justify-center">
              <Loader2 size={40} className="text-white animate-spin mb-3" />
              <p className="text-white font-semibold">Analyzing receipt...</p>
            </div>
          )}
        </div>
      </label>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

// Helper function
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

### Testing the OCR

**Test with these sample receipts:**
1. Take photo of any restaurant receipt
2. Make sure items, prices, tax, and tip are visible
3. Good lighting helps accuracy

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      { "name": "Burger", "price": 12.99, "quantity": 1 },
      { "name": "Fries", "price": 4.99, "quantity": 1 }
    ],
    "subtotal": 17.98,
    "tax": 1.53,
    "tip": 3.60,
    "total": 23.11,
    "taxPercent": 8.5,
    "tipPercent": 20.01,
    "date": "2026-02-01",
    "merchant": "Joe's Diner"
  }
}
```

---

## Option 2: Veryfi (Higher Accuracy, More Expensive)

### Setup

**1. Create Account**
```
1. Go to https://www.veryfi.com
2. Sign up for API access
3. Get approved (might take 1 day)
```

**2. Get Credentials**
```
1. Dashboard → API Keys
2. Copy: Client ID, Username, API Key
```

**3. Install SDK**
```bash
npm install @veryfi/veryfi-sdk
```

### Implementation

**API Route: `app/api/ocr/veryfi/route.ts`**
```typescript
import { NextResponse } from 'next/server'
const veryfi = require('@veryfi/veryfi-sdk')

const client = new veryfi.Client(
  process.env.VERYFI_CLIENT_ID!,
  process.env.VERYFI_CLIENT_SECRET!,
  process.env.VERYFI_USERNAME!,
  process.env.VERYFI_API_KEY!
)

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json()
    
    // Process receipt with Veryfi
    const response = await client.process_document_base64(
      imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      'receipt.jpg',
      {
        categories: ['Meals & Entertainment'],
        auto_delete: true // Delete from Veryfi after processing
      }
    )
    
    // Extract data
    const items = response.line_items.map((item: any) => ({
      name: item.description,
      price: item.total,
      quantity: item.quantity || 1
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        subtotal: response.subtotal,
        tax: response.tax,
        tip: response.tip,
        total: response.total,
        taxPercent: (response.tax / response.subtotal) * 100,
        tipPercent: (response.tip / response.subtotal) * 100,
        date: response.date,
        merchant: response.vendor?.name
      }
    })
    
  } catch (error: any) {
    console.error('Veryfi OCR Error:', error)
    return NextResponse.json(
      { error: 'Failed to process receipt' },
      { status: 500 }
    )
  }
}
```

**Pros:**
- ⭐⭐⭐⭐⭐ Best accuracy
- Extracts more fields (payment method, category, etc.)
- Good for complex receipts

**Cons:**
- 💰 More expensive ($0.50/receipt after free tier)
- Requires approval (1 day wait)
- Smaller free tier (100/month)

---

## Option 3: Google Cloud Vision (If Using Google Cloud)

### Setup

**1. Enable API**
```
1. Go to Google Cloud Console
2. Create new project
3. Enable "Cloud Vision API"
4. Create service account
5. Download JSON key file
```

**2. Install SDK**
```bash
npm install @google-cloud/vision
```

**3. Set Credentials**
```bash
# .env.local
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

### Implementation

**API Route: `app/api/ocr/google/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import vision from '@google-cloud/vision'

const client = new vision.ImageAnnotatorClient()

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json()
    
    // Detect text
    const [result] = await client.textDetection({
      image: {
        content: imageBase64.replace(/^data:image\/\w+;base64,/, '')
      }
    })
    
    const text = result.fullTextAnnotation?.text || ''
    
    // Parse receipt text (you'll need custom logic here)
    const parsedData = parseReceiptText(text)
    
    return NextResponse.json({
      success: true,
      data: parsedData
    })
    
  } catch (error: any) {
    console.error('Google Vision Error:', error)
    return NextResponse.json(
      { error: 'Failed to process receipt' },
      { status: 500 }
    )
  }
}

// Custom parsing logic (receipts vary widely)
function parseReceiptText(text: string) {
  // This is simplified - real implementation needs regex patterns
  // for different receipt formats
  const lines = text.split('\n')
  
  const items: any[] = []
  let subtotal = 0
  let tax = 0
  let total = 0
  
  lines.forEach(line => {
    // Look for item lines (item name + price)
    const itemMatch = line.match(/(.+?)\s+\$?(\d+\.\d{2})/)
    if (itemMatch) {
      items.push({
        name: itemMatch[1].trim(),
        price: parseFloat(itemMatch[2])
      })
    }
    
    // Look for totals
    if (line.toLowerCase().includes('subtotal')) {
      const match = line.match(/\$?(\d+\.\d{2})/)
      if (match) subtotal = parseFloat(match[1])
    }
    if (line.toLowerCase().includes('tax')) {
      const match = line.match(/\$?(\d+\.\d{2})/)
      if (match) tax = parseFloat(match[1])
    }
    if (line.toLowerCase().includes('total')) {
      const match = line.match(/\$?(\d+\.\d{2})/)
      if (match) total = parseFloat(match[1])
    }
  })
  
  return {
    items,
    subtotal,
    tax,
    total,
    taxPercent: (tax / subtotal) * 100,
    tipPercent: 0 // Needs custom logic
  }
}
```

**Pros:**
- Good for high volume (cheaper at scale)
- Already using Google Cloud

**Cons:**
- More complex setup
- Requires custom parsing logic
- Lower accuracy for receipts specifically

---

## Production Best Practices

### 1. Error Handling

```typescript
// Wrap OCR in try-catch with fallback
try {
  const ocrResult = await processReceipt(image)
  setReceiptData(ocrResult)
} catch (error) {
  // Fallback to manual entry
  setShowManualEntry(true)
  toast.error('Could not read receipt. Please enter items manually.')
}
```

### 2. Image Optimization

```typescript
// Compress image before sending to OCR
import imageCompression from 'browser-image-compression'

async function compressImage(file: File) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  }
  
  return await imageCompression(file, options)
}
```

### 3. Manual Review UI

Always let users review and edit OCR results:

```typescript
<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
  <div className="flex items-center gap-2 mb-3">
    <CheckCircle className="text-green-600" />
    <span className="font-semibold">Receipt Analyzed!</span>
  </div>
  
  <p className="text-sm text-gray-600 mb-3">
    Review the extracted items below. Tap to edit if anything looks wrong.
  </p>
  
  {items.map((item, i) => (
    <div key={i} className="flex justify-between items-center mb-2">
      <input 
        value={item.name}
        onChange={(e) => updateItem(i, 'name', e.target.value)}
        className="flex-1 mr-2 p-2 border rounded"
      />
      <input 
        value={item.price}
        onChange={(e) => updateItem(i, 'price', e.target.value)}
        className="w-24 p-2 border rounded"
        type="number"
        step="0.01"
      />
    </div>
  ))}
</div>
```

### 4. Loading States

```typescript
{isAnalyzing && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 
                    border-purple-500 border-t-transparent mx-auto mb-4" />
      <p className="font-semibold text-lg">Analyzing receipt...</p>
      <p className="text-sm text-gray-500 mt-2">
        This usually takes 2-3 seconds
      </p>
    </div>
  </div>
)}
```

### 5. Rate Limiting

```typescript
// Prevent spam (client-side)
const [lastUploadTime, setLastUploadTime] = useState(0)

function canUpload() {
  const now = Date.now()
  if (now - lastUploadTime < 2000) { // 2 second cooldown
    toast.error('Please wait before uploading another receipt')
    return false
  }
  setLastUploadTime(now)
  return true
}
```

---

## Cost Optimization

### Tips to Reduce OCR Costs

**1. Cache Results**
```typescript
// Store OCR results in database to avoid re-processing
await supabase.from('bills').update({
  ocr_cache: ocrResult,
  ocr_processed_at: new Date()
}).eq('id', billId)
```

**2. Compress Images**
```typescript
// Smaller images = faster processing = lower costs
const compressed = await compressImage(file)
```

**3. Add Confidence Threshold**
```typescript
// Only use OCR if confidence is high
if (ocrResult.confidence < 0.8) {
  // Fallback to manual entry
  setShowManualEntry(true)
}
```

**4. Use Manual Entry for Simple Bills**
```typescript
// Let users choose
<button onClick={() => setUseOCR(true)}>
  Scan Receipt (Auto)
</button>
<button onClick={() => setUseOCR(false)}>
  Enter Manually (Fast for <5 items)
</button>
```

---

## Testing Checklist

- [ ] Upload clear receipt → Items extracted correctly
- [ ] Upload blurry receipt → Graceful fallback to manual
- [ ] Upload non-receipt image → Error message shown
- [ ] Large image (>5MB) → Rejected with clear message
- [ ] No internet → User notified, can retry
- [ ] Tax/tip calculated correctly
- [ ] Users can edit OCR results
- [ ] Multiple receipts → All process correctly

---

## Monitoring

### Track OCR Performance

```typescript
// Log OCR metrics
await supabase.from('ocr_logs').insert({
  bill_id: billId,
  service: 'mindee',
  processing_time_ms: endTime - startTime,
  item_count: result.items.length,
  confidence_score: result.confidence,
  success: true,
  user_edited: false // Track if user had to fix OCR
})
```

### Dashboard Queries

```sql
-- OCR success rate
SELECT 
  COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as success_rate,
  AVG(processing_time_ms) as avg_time_ms,
  COUNT(*) FILTER (WHERE user_edited = true) * 100.0 / COUNT(*) as edit_rate
FROM ocr_logs
WHERE created_at > NOW() - INTERVAL '7 days';

-- Most common failures
SELECT error_message, COUNT(*) 
FROM ocr_logs 
WHERE success = false
GROUP BY error_message
ORDER BY COUNT(*) DESC;
```

---

## Summary: My Recommendation

**Use Mindee because:**
✅ Built specifically for receipts (best accuracy)  
✅ Easiest API - 10 lines of code  
✅ Generous free tier (250/month)  
✅ Affordable scaling ($0.04/receipt)  
✅ Great developer experience  

**Cost Example:**
- 100 receipts/month: **FREE**
- 500 receipts/month: **$10/month**
- 1,000 receipts/month: **$30/month**

Start with Mindee, monitor accuracy, switch only if you need to optimize costs at scale.

**Want me to build the complete OCR integration into your starter template?** 🚀
