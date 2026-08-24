# Bulga Backend

Bulga is a personal finance tracker that automatically reads FamPay transaction
notification emails from Gmail, parses them, and displays them in a clean,
custom-built dashboard — no manual entry required. It features budget tracking,
transaction tagging (Essential/Food/Miscellaneous), and category breakdowns,
with a Node/Express backend that securely fetches and stores transaction data
and a JavaScript frontend for the UI. The project is actively being extended
into a standalone Android app with real-time push notifications powered by
Google Cloud Pub/Sub and Firebase Cloud Messaging, along with OAuth-based
Gmail login to support multiple users beyond a single hardcoded account.

This repo is the server that fetches your FamPay transaction emails from Gmail
and serves them to the Bulga app.

## What it does

- `POST /refresh` — re-checks Gmail for FamPay emails and updates its
  internal database. This is what Bulga calls every time you open the app.
- `GET /transactions` — returns all stored transactions.
- `POST /transactions/:id/tag` — save a tag (Essential/Miscellaneous/Food)
  for a transaction.
- `GET /budget` / `POST /budget` — get/set your monthly budget.

Every request must include a header: `X-Bulga-Key: <your API key>`
This stops random people on the internet from hitting your API.

## Deploying to Railway (step by step)

1. Go to https://railway.app and sign up (you can use your GitHub or
   Google account).

2. Create a new GitHub repository (e.g. on https://github.com/new) called
   `bulga-backend`, and push this folder's contents to it.
   If you've never used git before, the simplest path is:
   - Install GitHub Desktop (https://desktop.github.com)
   - Open it, sign in, choose "Add an Existing Repository from your Hard Drive"
   - Point it at this `bulga-backend` folder
   - Publish the repository to GitHub (make it Private)

3. In Railway, click **New Project** → **Deploy from GitHub repo** →
   select your `bulga-backend` repo.

4. Railway will detect it's a Node app and start building automatically.
   Before it finishes, go to your new service's **Variables** tab and add:
   - `GOOGLE_CLIENT_ID` — from your client_secret.json
   - `GOOGLE_CLIENT_SECRET` — from your client_secret.json
   - `GOOGLE_REFRESH_TOKEN` — the one you generated earlier
   - `API_KEY` — make up a long random string yourself (this is like a
     password Bulga will use to talk to your server — keep it secret)

5. Go to the **Settings** tab of your service, find **Networking**, and
   click **Generate Domain**. Railway will give you a public URL like:
   `https://bulga-backend-production.up.railway.app`

6. Save that URL — you'll paste it into Bulga's settings next.

7. Test it's alive: open `https://your-url.up.railway.app/` in your
   browser. You should see: `{"status":"Bulga backend is running"}`

8. Test the refresh endpoint works (this actually calls Gmail). You can't
   easily do this from a browser since it needs a header, so ask Claude
   to help you test it, or use a tool like Postman/Insomnia, or run this
   from a terminal (replace both placeholders):
   ```
   curl -X POST https://your-url.up.railway.app/refresh -H "X-Bulga-Key: your-api-key"
   ```
   It should respond with something like `{"ok":true,"count":60}`

## Local testing (optional, before deploying)

```
npm install
cp .env.example .env
# then edit .env and fill in your real values
npm start
```

Server will run at http://localhost:3000
