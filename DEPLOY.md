# SimuLab — Deployment Guide
# Get a live URL in under 10 minutes (free)

## What you need
- GitHub account (free) → github.com
- Railway account (free) → railway.app

---

## Step 1 — Push to GitHub

1. Go to github.com → New repository
2. Name it: `simulab`
3. Set to Public, click Create

Then in terminal:
```bash
cd simulab
git init
git add .
git commit -m "SimuLab v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/simulab.git
git push -u origin main
```

---

## Step 2 — Deploy on Railway

1. Go to railway.app → Login with GitHub
2. Click "New Project"
3. Click "Deploy from GitHub repo"
4. Select your `simulab` repo
5. Railway auto-detects the Dockerfile ✓
6. Click Deploy

Wait 3-5 minutes for build (installs avr-gcc inside Docker).

---

## Step 3 — Get your URL

1. In Railway dashboard → your project
2. Click "Settings" → "Domains"
3. Click "Generate Domain"
4. You get: `simulab-production.up.railway.app`

---

## Step 4 — Custom domain (optional, free)

If you want `simulab.io` or `simulab.in`:
1. Buy domain on Namecheap (~$10/year for .io, ~$1 for .in)
2. In Railway → Settings → Custom Domain
3. Add your domain
4. Update DNS on Namecheap to point to Railway

Good domain names to check:
- simulab.in (cheap, Indian domain)
- simulab.tech
- getsimulabab.com
- simulab.dev

---

## Your live URLs after deploy

| URL | What |
|-----|------|
| yourdomain.railway.app/ | Landing page |
| yourdomain.railway.app/simulator | Circuit simulator |
| yourdomain.railway.app/compile | Compile API |
| yourdomain.railway.app/health | Server status |

---

## Free tier limits (Railway)

- 500 hours/month compute (enough for ~16hrs/day)
- 1GB RAM
- Sleeps after 30min inactivity (wakes in ~10s)
- No credit card needed for hobby plan

---

## If Railway asks for credit card → use Render instead

1. Go to render.com
2. New → Web Service
3. Connect GitHub repo
4. Runtime: Docker
5. Free tier: same limits

---

## Test your deployment

After deploy, open browser:
```
https://your-app.railway.app/health
```

Should show:
```json
{
  "status": "ok",
  "avr_gcc": "avr-gcc (GCC) 7.3.0",
  "node": "v20.x.x"
}
```

If avr_gcc shows "not found" → rebuild Docker image in Railway dashboard.

---

## Firebase Setup (Cloud Save + Google Login)

### Step 1 — Create Firebase project
1. Go to **console.firebase.google.com**
2. Click **Add project** → name it `simulab`
3. Disable Google Analytics → **Create project**

### Step 2 — Enable Google login
1. Build → **Authentication** → Get started
2. Sign-in providers → **Google** → Enable → Save

### Step 3 — Enable Firestore
1. Build → **Firestore Database** → Create database
2. Select **Start in test mode** → Next → Done

### Step 4 — Get config
1. Project Settings (gear icon) → Your apps → **Web** (</> icon)
2. Register app → copy the `firebaseConfig` object

### Step 5 — Add config to SimuLab
Open `js/firebase.js` and replace:
```js
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  ...
};
```
With your actual config from Firebase.

### Step 6 — Add Firestore security rules
In Firebase Console → Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
  }
}
```

That's it — users can now sign in with Google and save projects to the cloud!
