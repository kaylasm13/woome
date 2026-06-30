# Woo Me — Setup Guide

Follow these steps in order. Should take about 15 minutes.

---

## Step 1: Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Name it **"Woo Me"** (or anything you like).
3. Leave it open — you'll need it in the next step.

---

## Step 2: Set Up Google Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**.
2. Delete all the default code in the editor.
3. Open the file `apps-script.js` from this folder, copy everything, and paste it into the Apps Script editor.
4. Update the **CONFIG** block at the top of the script:

```js
const CONFIG = {
  ADMIN_PASSWORD: 'your-strong-password-here',   // ← Make this something only you know
  NOTIFICATION_EMAIL: 'kayla.mundt13@gmail.com',  // ← Already set for you
  SHEET_NAME: 'Submissions',
  DRIVE_FOLDER_NAME: 'Woo Me Uploads',
  CALENDLY_LINK: 'https://calendly.com/YOUR-LINK', // ← Paste your Calendly link
  CASH_APP_HANDLE: '$itsmekayla282622',             // ← Already set for you
};
```

5. Click **Save** (the floppy disk icon or Ctrl/Cmd + S).

---

## Step 3: Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set the following:
   - **Description**: Woo Me Backend
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**.
5. You'll be asked to authorize the app — click through and allow access.
6. **Copy the Web App URL** — it looks like:
   `https://script.google.com/macros/s/XXXXXXXXXX/exec`

---

## Step 4: Add the Script URL to Your HTML Files

Open each of these files and find the line:

```js
const SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
```

Replace `YOUR_APPS_SCRIPT_URL_HERE` with the URL you copied in Step 3. Do this in:
- `index.html`
- `apply.html`
- `admin.html`

---

## Step 5: Host the Website

You need somewhere to host the three HTML files. The easiest free options:

### Option A: Netlify (Recommended — 5 minutes)
1. Go to [netlify.com](https://netlify.com) and sign up (free).
2. Drag the entire `woo-me` folder onto the Netlify dashboard.
3. Your site is live instantly. You can connect a custom domain in settings.

### Option B: GitHub Pages (Free)
1. Create a GitHub account and a new repository.
2. Upload all files from the `woo-me` folder.
3. Go to Settings → Pages → select the main branch.
4. Your site is live at `yourusername.github.io/repo-name`.

### Option C: Vercel (Free)
1. Go to [vercel.com](https://vercel.com) and sign up.
2. Import or drag-and-drop the `woo-me` folder.

---

## Step 6: Test Everything

1. Open your live site and submit a test application.
2. Check that you received a notification email.
3. Check your Google Sheet — you should see a new row.
4. Open `admin.html` on your site, log in with your password, and confirm the submission appears.
5. Try clicking "Send Calendly link" and verify the email arrives.

---

## Accessing the Admin Panel

Your admin panel is at:
```
https://your-site.com/admin.html
```

Bookmark it. Log in with the password you set in Step 4.

---

## Re-deploying After Changes

If you ever edit the Apps Script code:
1. Click **Deploy → Manage deployments**.
2. Click the pencil icon on your existing deployment.
3. Change "Version" to **New version**.
4. Click **Deploy**.

**Note:** If you change the script but don't create a new deployment version, the live URL will still run the old code.

---

## Connecting a Custom Domain

If you want `woome.com` or similar:
1. Buy a domain (Namecheap, Google Domains, etc.)
2. In Netlify: Site settings → Domain management → Add custom domain
3. Follow the DNS instructions — usually live within an hour.

---

## File Structure

```
woo-me/
├── index.html        ← Landing page (public)
├── apply.html        ← Application form (public)
├── admin.html        ← Admin dashboard (you only)
├── apps-script.js    ← Backend (paste into Apps Script)
└── SETUP.md          ← This file
```
