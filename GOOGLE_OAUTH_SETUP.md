# Google Business Profile OAuth Setup Guide

This guide will help you set up automatic Place ID extraction using Google Business Profile OAuth.

## What This Does

- ✅ **Automatic Place ID extraction** - No manual entry needed
- ✅ **Works for service-area businesses** - Even without a physical address
- ✅ **One-click connection** - Users just click "Connect Google Business Profile"
- ✅ **Auto-sync** - Place ID is fetched automatically from their Google Business Profile

## Setup Steps

### 1. Run Database Migration

Run this SQL in your Supabase SQL Editor:

```bash
# Or use Supabase migrations
cd supabase/migrations
# The file is: 20250316000000_google_business_oauth.sql
```

### 2. Request Business Profile API Access

⚠️ **Important**: Google requires manual approval for Business Profile API access.

1. Go to [Google Business Profile API Access Form](https://support.google.com/business/contact/business_api)
2. Fill out the form explaining your use case
3. Google will open a support case and review within 5 business days
4. Wait for approval email before proceeding

### 3. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Enable these APIs:
   - **My Business Account Management API**
   - **My Business Business Information API**
   - **Places API (New)** or **Places API**
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Application type: **Web application**
7. Add **Authorized redirect URIs** (must match **exactly**, including `www` vs apex and path):

   **Local dev**
   - `http://localhost:3000/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/login-callback`
   - `http://localhost:3000/api/auth/google/signup-callback`
   - (Optional) same three paths on `http://localhost:3001` if you use that port

   **Production — add every URI your app can send.**  
   `NEXT_PUBLIC_APP_URL` is prefixed to these paths in the browser. If production uses **`https://www.usereviewflo.com`**, register:
   - `https://www.usereviewflo.com/api/auth/google/callback` (Settings → Connect Google Business)
   - `https://www.usereviewflo.com/api/auth/google/login-callback` (Login with Google)
   - `https://www.usereviewflo.com/api/auth/google/signup-callback` (Join / signup with Google)

   If you ever set `NEXT_PUBLIC_APP_URL` to the apex domain, also add the same three paths with `https://usereviewflo.com/...`. Google does **not** treat `www` and apex as the same redirect URI.
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

### 3. Update Environment Variables

Add to `.env.local`:

```bash
# Google OAuth for Business Profile
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here

# Also add as public env var for frontend:
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

### 4. Restart Your Dev Server

```bash
npm run dev
```

### 5. Test It!

1. Go to **Settings** page
2. Scroll to "Google Business Profile Integration"
3. Click **"Connect Google Business Profile"**
4. Authorize with Google
5. Your Place ID will be automatically fetched and saved!
6. Go to **Dashboard** and click "Refresh Stats" to see your Google Business stats

## How It Works

1. User clicks "Connect Google Business Profile"
2. Redirected to Google OAuth consent screen
3. User authorizes access to their Business Profile
4. Google redirects back with authorization code
5. We exchange code for access + refresh tokens
6. We call Business Profile API to get their locations
7. We extract the Place ID from their first location
8. We save the Place ID + tokens in the database
9. Stats are now automatically available!

## Troubleshooting

### "No business locations found"
- Make sure the user has a Google Business Profile
- They need to be logged in with the Google account that manages the business

### "API not enabled"
- Make sure you enabled "Google Business Profile API" in Google Cloud Console

### "Redirect URI mismatch"
- Make sure you added all redirect URIs to your OAuth client
- Check that `NEXT_PUBLIC_APP_URL` matches your domain

### Google Cloud “OAuth Overview” warnings (dashboard)

- **`state` parameter / CSRF:** Login and signup now start at `/api/auth/google/start?flow=login` or `flow=signup`, which sets a short-lived cookie and sends `state` to Google; callbacks verify it. Settings → “Connect Google Business Profile” already used `state` (Supabase session token).
- **Loopback redirects:** If Google warns that your **production** web client allows `http://localhost:...`, either remove localhost URIs from that client and create a **second** OAuth client (same APIs) used only in dev, or accept the warning for a small app.
- **Cross-Account Protection / incremental authorization:** Optional hardening features; not required for basic sign-in. You can enable or ignore based on Google’s docs unless you have enterprise compliance needs.

### "Service area businesses not showing"
- Service area businesses ARE supported!
- The API returns Place IDs even for businesses without physical addresses

### "Quota exceeded" error
- The My Business Account Management API has low default quotas (60 requests/minute)
- Wait 1-2 minutes and try again
- For production: Request a quota increase in Google Cloud Console

## Important: Request Quota Increase for Production

The My Business Account Management API has very low default quotas (60 requests/minute). Before launching to users:

1. Go to **APIs & Services** → **My Business Account Management API** → **Quotas & System Limits**
2. Find "Requests per minute"
3. Click the pencil icon to request an increase
4. Request 10,000 requests/minute (free, requires Google approval)
5. This ensures smooth operation when multiple users connect their accounts

## Future Enhancements

- [ ] Let users choose which location if they have multiple
- [ ] Auto-refresh stats daily using the refresh token
- [ ] Show connected business name in settings
- [ ] Add "Disconnect" button
