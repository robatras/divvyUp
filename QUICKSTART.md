# 🚀 DivvyUp - Quick Start Guide

## Get Running in 5 Minutes!

### 1. Install Dependencies (2 min)
```bash
cd divvyup
npm install
```

### 2. Setup Environment (1 min)
```bash
cp .env.example .env.local
```

Then open `.env.local` and add your keys (get them from setup guide).

### 3. Start Development Server (1 min)
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ✅ What Works Out of the Box

- ✅ Beautiful UI
- ✅ Create bills manually
- ✅ Add items and participants
- ✅ View bills
- ✅ Mobile-responsive design

## ⚠️ What Needs API Keys

- ❌ SMS sending (needs Twilio)
- ❌ Receipt OCR (needs Mindee)
- ❌ Database storage (needs Supabase)

---

## 🎯 Your First 3 Tasks

### Task 1: Set up Supabase (Required)
**Time: 10 minutes**

1. Go to [supabase.com](https://supabase.com)
2. Create account + project
3. Run the SQL schema (see README)
4. Copy API keys to `.env.local`
5. Restart dev server

**Now you can save bills to database!** ✅

### Task 2: Set up Twilio (Required for SMS)
**Time: 10 minutes**

1. Go to [twilio.com](https://www.twilio.com)
2. Sign up (get $15 free credit)
3. Buy a phone number ($1/month)
4. Copy credentials to `.env.local`
5. Restart dev server

**Now you can send SMS invites!** ✅

### Task 3: Set up Mindee (Optional)
**Time: 5 minutes**

1. Go to [mindee.com](https://mindee.com)
2. Sign up (250 free receipts/month)
3. Get API key
4. Add to `.env.local`
5. Restart dev server

**Now receipt OCR works!** ✅

---

## 🎉 You're Done!

Test the full flow:
1. Create a bill
2. Upload receipt (or add items manually)
3. Add participants with phone numbers
4. SMS gets sent
5. Click link on phone
6. Claim items
7. See calculated splits

---

## 🆘 Need Help?

**Common Issues:**

**"npm install" fails**
- Make sure you have Node.js 18+ installed
- Try: `npm install --legacy-peer-deps`

**"Can't connect to Supabase"**
- Check your `.env.local` file
- Make sure you copied the keys correctly
- Restart the dev server: `npm run dev`

**"SMS not sending"**
- Twilio trial can only send to verified numbers
- Verify your number in Twilio console
- Or upgrade account ($20 min) to remove restrictions

---

## 📚 Next Steps

Once everything works locally:

1. **Deploy to Vercel** (15 min)
   - Push to GitHub
   - Connect to Vercel
   - Add environment variables
   - Deploy!

2. **Customize the UI** 
   - Change colors in `tailwind.config.js`
   - Modify components in `components/`
   - Add your logo

3. **Add Features**
   - Venmo integration
   - User accounts
   - Bill history
   - Analytics

---

**Questions? Check the full README.md for detailed guides!**
