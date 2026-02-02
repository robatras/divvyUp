# SplitEase Implementation Guide 🚀

## Overview
This guide will take you from zero to deployed app in ~2-3 hours. We'll set up:
- ✅ Next.js app with beautiful UI
- ✅ Supabase database & authentication
- ✅ Twilio SMS sending
- ✅ Receipt OCR (optional initially)
- ✅ Vercel deployment

---

## Phase 1: Initial Setup (30 minutes)

### Step 1: Create Next.js Project
```bash
# Create new Next.js app with TypeScript
npx create-next-app@latest splitease --typescript --tailwind --app --no-src-dir

cd splitease

# Install dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install lucide-react
npm install twilio
```

### Step 2: Set Up Supabase (10 minutes)

**A. Create Account & Project**
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up (free tier is perfect)
4. Create new project:
   - Name: `splitease`
   - Database password: (save this!)
   - Region: Choose closest to you
   - Wait 2-3 minutes for provisioning

**B. Create Database Schema**
1. In Supabase dashboard → SQL Editor
2. Copy the entire `database-schema.sql` file I provided
3. Click "Run" to create all tables

**C. Set Up Storage**
1. Go to Storage → Create bucket
2. Name: `receipts`
3. Make it **public** (so people can view receipts)
4. Set policies:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Users can upload receipts"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'receipts');
   
   -- Allow anyone to view receipts (they have the link)
   CREATE POLICY "Anyone can view receipts"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'receipts');
   ```

**D. Get API Keys**
1. Go to Settings → API
2. Copy these values (you'll need them):
   - `Project URL` (e.g., https://abc123.supabase.co)
   - `anon public` key
   - `service_role` key (keep this secret!)

### Step 3: Set Up Twilio (10 minutes)

**A. Create Account**
1. Go to https://www.twilio.com
2. Sign up (free trial gives you $15 credit)
3. Verify your phone number

**B. Get Phone Number**
1. In console → Phone Numbers → Buy a number
2. Choose a number with SMS capability
3. Cost: ~$1/month

**C. Get Credentials**
1. Go to Console → Account Info
2. Copy:
   - Account SID
   - Auth Token
   - Your Twilio phone number

**Cost Estimate:**
- Phone number: $1/month
- SMS: $0.0079/message (US)
- Free tier: $15 credit (covers ~1,900 texts!)

### Step 4: Environment Variables

Create `.env.local` in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567

# App URL (update after deployment)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Phase 2: Build Core Features (1-2 hours)

### File Structure
```
splitease/
├── app/
│   ├── page.tsx                 # Home page
│   ├── create/
│   │   └── page.tsx            # Create bill flow
│   ├── bill/
│   │   └── [id]/
│   │       └── page.tsx        # Bill details (organizer view)
│   ├── join/
│   │   └── [code]/
│   │       └── page.tsx        # Join via code (participant)
│   └── api/
│       ├── bills/
│       │   ├── route.ts        # POST /api/bills
│       │   └── [id]/
│       │       └── route.ts    # GET /api/bills/:id
│       ├── claims/
│       │   └── route.ts        # POST /api/claims
│       ├── sms/
│       │   └── route.ts        # POST /api/sms (send invites)
│       └── ocr/
│           └── route.ts        # POST /api/ocr (optional)
├── components/
│   ├── BillCreator.tsx
│   ├── ParticipantView.tsx
│   ├── OrganizerDashboard.tsx
│   └── ui/                     # Reusable components
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── twilio.ts              # Twilio helpers
│   └── utils.ts               # Utility functions
└── public/
```

### Quick Start: Copy Components

I can provide you with starter code for each component. Here's what each does:

**1. `lib/supabase.ts`** - Database client
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**2. `lib/twilio.ts`** - SMS sending
```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendBillInvite(
  phoneNumber: string,
  billCode: string,
  organizerName: string
) {
  const message = await client.messages.create({
    body: `${organizerName} invited you to split a bill! View and claim your items: ${process.env.NEXT_PUBLIC_APP_URL}/join/${billCode}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  })
  
  return message
}
```

**3. Copy the React components I created** - They're production-ready!
- Use the `bill-splitter.jsx` as your starting point
- Convert to TypeScript and split into smaller components

---

## Phase 3: Add OCR (Optional - Can Skip Initially)

### Option A: Skip OCR for MVP
- Let users manually enter items
- Add OCR later when you have users
- Saves time and money initially

### Option B: Use Mindee (Easiest)
```bash
npm install mindee
```

**Setup:**
1. Go to https://mindee.com
2. Sign up (free tier: 250 pages/month)
3. Get API key
4. Add to `.env.local`:
   ```bash
   MINDEE_API_KEY=your_api_key
   ```

**Code:**
```typescript
// app/api/ocr/route.ts
import { Client, ReceiptV5 } from 'mindee'

export async function POST(request: Request) {
  const { imageBase64 } = await request.json()
  
  const client = new Client({ apiKey: process.env.MINDEE_API_KEY })
  const input = client.docFromBase64(imageBase64, 'receipt.jpg')
  const response = await client.parse(ReceiptV5, input)
  
  const receipt = response.document.inference.prediction
  
  return Response.json({
    subtotal: receipt.totalNet.value,
    tax: receipt.totalTax.value,
    total: receipt.totalAmount.value,
    items: receipt.lineItems.map(item => ({
      name: item.description,
      price: item.totalAmount
    }))
  })
}
```

### Option C: Use Google Vision API
- More complex setup
- Better accuracy
- More expensive ($1.50 per 1000 images)

**My Recommendation:** Skip OCR for MVP, add it after you get user feedback.

---

## Phase 4: Deploy to Vercel (15 minutes)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/splitease.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "New Project"
4. Import your `splitease` repo
5. Add environment variables:
   - Copy all variables from `.env.local`
   - Update `NEXT_PUBLIC_APP_URL` to your Vercel URL
6. Click "Deploy"
7. Wait 2-3 minutes ☕

### Step 3: Update Environment Variables
1. After deployment, copy your Vercel URL (e.g., `splitease.vercel.app`)
2. In Vercel → Settings → Environment Variables
3. Update `NEXT_PUBLIC_APP_URL` to your new URL
4. Redeploy (will auto-trigger)

---

## Phase 5: Testing (30 minutes)

### Test Checklist

**1. Create Bill Flow**
- [ ] Upload receipt (or skip and add items manually)
- [ ] Add items with prices
- [ ] Add participants with phone numbers
- [ ] Verify SMS sent (check Twilio logs)
- [ ] Check bill appears in Supabase database

**2. Join Bill Flow**
- [ ] Click SMS link on phone
- [ ] Verify bill loads correctly
- [ ] Claim items
- [ ] See total update in real-time
- [ ] Check claims saved in database

**3. Organizer Dashboard**
- [ ] See participant statuses
- [ ] See who's responded
- [ ] See calculated splits
- [ ] Verify math is correct

**4. Edge Cases**
- [ ] What if someone claims no items?
- [ ] What if an item is claimed by multiple people?
- [ ] What if someone enters invalid phone number?

---

## Development Workflow

### Local Development
```bash
# Start dev server
npm run dev

# Open http://localhost:3000
# Make changes → auto-reloads
```

### Database Changes
```bash
# Any schema changes:
# 1. Update database-schema.sql
# 2. Run in Supabase SQL Editor
# 3. Test locally
# 4. Commit to git
```

### Deploy Updates
```bash
# Just push to GitHub
git add .
git commit -m "Add feature X"
git push

# Vercel auto-deploys on push! 🎉
```

---

## Cost Breakdown

### Free Tier (Totally Free!)
- **Vercel**: Free for hobby projects
- **Supabase**: Free up to:
  - 500MB database
  - 1GB file storage
  - 2GB bandwidth
  - Perfect for MVP!
- **Twilio**: $15 free credit (~1,900 texts)

### After Free Tier (~$5-10/month)
- **Twilio**: $1/month + $0.0079/SMS
- **Vercel**: Free (unless you need pro features)
- **Supabase**: $25/month (if you exceed free tier)
- **Mindee OCR**: $0.04/page after 250 free

**Estimated costs for 100 active users:**
- 400 SMS/month = $3.16
- Supabase free tier = $0
- Vercel = $0
- **Total: ~$4/month** 🎉

---

## Troubleshooting

### "Supabase connection failed"
- Check `.env.local` has correct URL and keys
- Verify project is not paused (happens after 7 days inactive on free tier)
- Check if you're using `NEXT_PUBLIC_` prefix for client-side vars

### "SMS not sending"
- Verify phone numbers are in E.164 format: `+15551234567`
- Check Twilio trial restrictions (can only send to verified numbers)
- Upgrade Twilio account ($20) to remove restrictions
- Check Twilio logs for detailed error messages

### "Image upload failing"
- Verify storage bucket is public
- Check RLS policies are set correctly
- Ensure file size < 5MB (implement client-side check)

### "Build failing on Vercel"
- Check build logs in Vercel dashboard
- Common issues:
  - Missing environment variables
  - TypeScript errors
  - Import path issues
- Fix locally first: `npm run build`

---

## Post-Launch Checklist

### Week 1: Polish
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add confirmation dialogs
- [ ] Test on different phones
- [ ] Fix any UX issues

### Week 2: Optimize
- [ ] Add analytics (Vercel Analytics)
- [ ] Monitor error rates
- [ ] Check SMS costs
- [ ] Optimize database queries
- [ ] Add caching where needed

### Month 1: Iterate
- [ ] Gather user feedback
- [ ] Add most-requested features
- [ ] Consider adding OCR if not already done
- [ ] Add Venmo integration?
- [ ] Improve mobile experience

---

## Next Steps After MVP

### Features to Add Later
1. **Venmo Integration** - Auto-generate payment requests
2. **Receipt OCR** - If you skipped it
3. **Groups** - Save standing dinner groups
4. **Split Strategies** - Even split, by person, custom
5. **Bill History** - View past bills, analytics
6. **Export** - Download bill as PDF
7. **Notifications** - Push notifications instead of just SMS
8. **Multi-currency** - Support international users

### Scaling Considerations
When you get to 1,000+ users:
- Add Redis caching (Upstash, $10/month)
- Move to Supabase Pro ($25/month)
- Add rate limiting
- Consider using a queue for SMS (BullMQ)
- Add monitoring (Sentry, LogRocket)

---

## Quick Start Script

Want to get started FAST? Run this:

```bash
# 1. Clone starter template (I can create this for you)
git clone https://github.com/yourusername/splitease-starter
cd splitease-starter
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Fill in your keys (Supabase, Twilio)
nano .env.local

# 4. Start dev server
npm run dev

# 5. Open http://localhost:3000
# You're running! 🎉
```

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Twilio SMS Docs**: https://www.twilio.com/docs/sms
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs

---

## Summary: Time to Production

| Phase | Time | What You're Doing |
|-------|------|-------------------|
| Setup accounts | 30 min | Supabase, Twilio, Vercel |
| Initial code | 1 hour | Set up Next.js, add API routes |
| Build UI | 1 hour | Copy components, style |
| Deploy | 15 min | Push to Vercel |
| Test | 30 min | End-to-end testing |
| **Total** | **~3 hours** | **Live app!** |

**Manual Work Required:**
1. Create Supabase account & run schema
2. Create Twilio account & buy number
3. Set up environment variables
4. Deploy to Vercel

**No Manual Work:**
- All code is provided
- Database schema is ready
- UI components are done
- Just plug in your API keys!

---

## Want Me to Create a Starter Template?

I can create a complete Next.js starter template with:
- ✅ All components built
- ✅ API routes configured
- ✅ Database helpers ready
- ✅ TypeScript types defined
- ✅ Tailwind styled
- ✅ README with setup instructions

Just say the word and I'll build it! 🚀
