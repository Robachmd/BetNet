# Chapa on production (Render)

This project uses **Chapa** for listing-package checkout and other payments. The backend needs a **secret** key; the SPA needs a **public** key baked in at build time.

## Symptom: “Chapa is not configured correctly…”

On **Listing packages**, that message appears when the API returns Chapa init errors with `reason` equal to `missing_server_key`, `wrong_key_type`, or `invalid_api_key`. Fix it by correcting environment variables (no frontend code change required for the default case).

## 1. Backend: `CHAPA_SECRET_KEY`

1. Open [Render Dashboard](https://dashboard.render.com) → your **Web Service** (Docker app).
2. **Environment** → add or edit:
   - **Key:** `CHAPA_SECRET_KEY`
   - **Value:** your Chapa **secret** from the Chapa dashboard. It must start with **`CHASECK_`** (never `CHAPUBK_` public keys).
3. Use **test** vs **live** keys consistently with your Chapa account mode.
4. **Save** and **Manual Deploy** (or redeploy) so the container picks up the new variable.

`django-environ` reads this in [`backend/betnet/settings.py`](../backend/betnet/settings.py); [`backend/payments/services.py`](../backend/payments/services.py) validates the key before calling Chapa.

## 2. Frontend build: `REACT_APP_CHAPA_PUBLIC_KEY`

Create React reads this at **`npm run build`** time. For Docker on Render, pass it into the **frontend build stage**:

1. In the same Render service **Environment**, add:
   - **Key:** `REACT_APP_CHAPA_PUBLIC_KEY`
   - **Value:** your Chapa **public** key (`CHAPUBK_...`) from the **same** environment (test or live) as `CHAPA_SECRET_KEY`.
2. Render exposes service env vars during `docker build` so the Dockerfile can bake the key into the static bundle.
3. Redeploy after changing it.

The [root Dockerfile](../Dockerfile) declares `ARG`/`ENV` for this variable in the Node build stage.

## 3. Verify

1. Open **Property Owner → Listing packages**, choose **Chapa**, and start checkout.
2. You should receive a **checkout URL** (redirect to Chapa) instead of a JSON error.
3. If you see a message about the **merchant not active**, configure the account in the Chapa dashboard (different `reason`).

## 4. Local development

Copy [`backend/.env.example`](../backend/.env.example) and [`frontend/.env.example`](../frontend/.env.example). Set both keys locally; run frontend with `npm start` and backend with `python manage.py runserver`.
