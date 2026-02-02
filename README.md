# 🥧 DivvyUp - Split Bills Instantly

> The easiest way to split bills with friends. Upload receipt, invite friends, done!

![DivvyUp Banner](https://via.placeholder.com/1200x300/667eea/ffffff?text=DivvyUp)

## 🚀 Quick Start (5 minutes to running locally)

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. **Clone or download this project**

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

4. **Start development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📋 Complete Setup Guide

### Step 1: Supabase Setup (10 minutes)

1. **Create Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up (free)
   - Create new project
   - Wait 2-3 minutes for provisioning

2. **Run Database Schema**
   - Go to SQL Editor in Supabase dashboard
   - Copy contents from `database-schema.sql` (provided separately)
   - Click "Run"
   - ✅ All tables created!

3. **Set up Storage**
   - Go to Storage → Create bucket
   - Name: `receipts`
   - Make it **public**
   - Add RLS policies (in SQL Editor):
   ```sql
   CREATE POLICY "Users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
   CREATE POLICY "Anyone can view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'receipts');
   ```

4. **Get API Keys**
   - Settings → API
   - Copy `Project URL` and `anon public` key
   - Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### Step 2: Twilio Setup (10 minutes)

1. **Create Twilio Account**
   - Go to [twilio.com](https://www.twilio.com)
   - Sign up (free $15 credit)
   - Verify your phone

2. **Get Phone Number**
   - Console → Phone Numbers → Buy a number
   - Choose SMS-capable number (~$1/month)

3. **Get Credentials**
   - Console → Account Info
   - Copy Account SID and Auth Token
   - Add to `.env.local`:
   ```bash
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+15551234567
   ```

### Step 3: Mindee OCR Setup (5 minutes) - OPTIONAL

1. **Create Mindee Account**
   - Go to [mindee.com](https://mindee.com)
   - Sign up (free 250 receipts/month)

2. **Get API Key**
   - Dashboard → API Keys
   - Create new key
   - Add to `.env.local`:
   ```bash
   MINDEE_API_KEY=your_mindee_api_key
   ```

**Skip OCR for now?** You can! Users can manually enter items. Add OCR later when needed.

### Step 4: Test Locally

```bash
npm run dev
```

Visit http://localhost:3000 and try:
1. Create a bill (with or without receipt)
2. Add items
3. Add participants (use your own phone number for testing)
4. Check if SMS arrives
5. Open link and claim items
6. If you lose the organizer link, go to `/organizer/recover` to recover it via SMS

Note: The organizer phone number is required to enable SMS recovery.

---

## 🚀 Deploy to Production (15 minutes)

### Deploy on Vercel (Recommended)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/divvyup.git
git push -u origin main
```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Import your repository
   - Add environment variables (copy from `.env.local`)
   - Deploy!

3. **Update Environment**
   - After deployment, copy your Vercel URL
   - Update in Vercel → Settings → Environment Variables:
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
   - Redeploy

---

## 📁 Project Structure

```
divvyup/
├── app/
│   ├── page.tsx                 # Home page
│   ├── create/                  # Create bill flow
│   ├── bill/[id]/              # Bill details
│   ├── join/[code]/            # Join via code
│   └── api/
│       ├── bills/              # Create/get bills
│       ├── claims/             # Claim items
│       ├── sms/                # Send invites
│       └── ocr/                # Receipt processing
├── components/                  # React components
├── lib/
│   ├── supabase.ts             # Database client
│   ├── twilio.ts               # SMS client
│   └── utils.ts                # Utilities
├── types/
│   └── index.ts                # TypeScript types
└── public/                     # Static assets
```

---

## 🎨 Customization

### Change Colors

Edit `tailwind.config.js`:
```javascript
colors: {
  primary: {
    DEFAULT: '#667eea',  // Your brand color
    dark: '#764ba2',
  },
}
```

### Change Fonts

Edit `app/globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Your+Font&display=swap');
```

### Modify UI Components

All components are in `components/` directory. Each is fully commented and easy to customize.

---

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run linter
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role (server-side) |
| `TWILIO_ACCOUNT_SID` | ✅ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | ✅ | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | ✅ | Your Twilio phone number |
| `MINDEE_API_KEY` | ⚪ | Mindee OCR key (optional) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your app URL |

---

## 💰 Cost Breakdown

### Free Tier (Perfect for MVP)
- **Vercel**: Free hosting
- **Supabase**: Free (500MB DB, 1GB storage, 2GB bandwidth)
- **Twilio**: $15 free credit (~1,900 texts)
- **Mindee**: Free (250 receipts/month)

### Paid Tier (After Growth)
- **Twilio**: $1/month + $0.0079/SMS
- **Supabase**: $25/month (if exceed free tier)
- **Mindee**: $0.04/receipt after 250

**Estimated cost for 100 active users: ~$4-10/month**

---

## 🐛 Troubleshooting

### "Supabase connection failed"
- ✅ Check `.env.local` has correct URL and keys
- ✅ Verify project isn't paused (happens after 7 days inactive)
- ✅ Use `NEXT_PUBLIC_` prefix for client variables

### "SMS not sending"
- ✅ Verify phone numbers in E.164 format: `+15551234567`
- ✅ Check Twilio trial restrictions (can only send to verified numbers)
- ✅ Upgrade Twilio account to remove restrictions
- ✅ Check Twilio logs for errors

### "Image upload failing"
- ✅ Verify storage bucket is public
- ✅ Check RLS policies are correct
- ✅ Ensure file size < 5MB

### "Build failing"
- ✅ Run `npm run build` locally first
- ✅ Check all environment variables are set
- ✅ Look at build logs in Vercel dashboard

---

## 🎯 Roadmap

### Phase 1 (MVP) - Current
- [x] Create bills
- [x] Upload receipts
- [x] OCR extraction
- [x] SMS invites
- [x] Claim items
- [x] Calculate splits

### Phase 2 (Next)
- [ ] Venmo integration
- [ ] Bill history
- [ ] User accounts
- [ ] Bill templates
- [ ] Groups/teams

### Phase 3 (Future)
- [ ] Mobile app (React Native)
- [ ] Receipt photo editing
- [ ] Split strategies (even, by percentage, custom)
- [ ] Analytics/insights
- [ ] Multi-currency

---

## 📞 Support

### Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Twilio SMS Docs](https://www.twilio.com/docs/sms)
- [Mindee Docs](https://developers.mindee.com)

### Need Help?
- Check the troubleshooting section above
- Review the implementation guides (provided separately)
- Check API route files - they have comments!

---

## 📄 License

MIT License - Feel free to use for personal or commercial projects!

---

## 🙏 Acknowledgments

Built with:
- Next.js 14
- Supabase
- Tailwind CSS
- Twilio
- Mindee

---

**Ready to split bills the easy way? Let's DivvyUp! 🥧**
