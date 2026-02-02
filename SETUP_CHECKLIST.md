# ✅ DivvyUp Setup Checklist

Print this out or keep it open while setting up!

## Initial Setup
- [ ] Downloaded/extracted DivvyUp project
- [ ] Opened terminal/command prompt
- [ ] Navigated to divvyup folder: `cd divvyup`
- [ ] Ran `npm install` (wait 2-3 minutes)
- [ ] Copied `.env.example` to `.env.local`

## Supabase Setup (Required)
- [ ] Created account at supabase.com
- [ ] Created new project (wait 2-3 min for provisioning)
- [ ] Opened SQL Editor
- [ ] Copied `database-schema.sql` contents
- [ ] Ran SQL in editor (click "Run")
- [ ] Created storage bucket named "receipts"
- [ ] Made bucket public
- [ ] Added RLS policies for storage
- [ ] Copied Project URL to `.env.local`
- [ ] Copied anon key to `.env.local`
- [ ] Copied service role key to `.env.local`

## Twilio Setup (Required for SMS)
- [ ] Created account at twilio.com
- [ ] Verified phone number
- [ ] Bought a phone number ($1/month)
- [ ] Copied Account SID to `.env.local`
- [ ] Copied Auth Token to `.env.local`
- [ ] Copied Phone Number to `.env.local`

## Mindee Setup (Optional - For OCR)
- [ ] Created account at mindee.com
- [ ] Got API key from dashboard
- [ ] Copied API key to `.env.local`

## Testing
- [ ] Ran `npm run dev`
- [ ] Opened http://localhost:3000 in browser
- [ ] Created a test bill
- [ ] Added items
- [ ] Added participant (your phone number)
- [ ] Checked if SMS arrived
- [ ] Clicked link and claimed items
- [ ] Verified splits calculated correctly

## Deployment (Optional)
- [ ] Pushed code to GitHub
- [ ] Created Vercel account
- [ ] Imported repository in Vercel
- [ ] Added all environment variables
- [ ] Deployed
- [ ] Updated `NEXT_PUBLIC_APP_URL` in Vercel
- [ ] Redeployed
- [ ] Tested live site

## Next Steps
- [ ] Customize colors in `tailwind.config.js`
- [ ] Add your logo/branding
- [ ] Test with real friends
- [ ] Gather feedback
- [ ] Iterate!

---

**Stuck? Check:**
- README.md (main guide)
- QUICKSTART.md (fast setup)
- docs/IMPLEMENTATION_GUIDE.md (detailed)
- docs/OCR_GUIDE.md (OCR setup)
