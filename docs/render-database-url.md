# Set `DATABASE_URL` safely on Render

Never commit real Postgres URLs, passwords, or `DATABASE_URL` values to git. This repository ignores `backend/.env` and `.env` files (see root `.gitignore`).

## Option A: Link the database (recommended)

1. Open [Render Dashboard](https://dashboard.render.com).
2. Select your **PostgreSQL** instance.
3. Find **Connect** / **Link** / **Add to service** (wording varies) and attach it to your **Web Service** that runs this app.
4. Render injects **`DATABASE_URL`** automatically. Redeploy the web service if it does not restart by itself.

## Option B: Manual secret on the web service

1. Open your **Web Service** (Docker app), not the database only.
2. **Environment** → **Add Environment Variable**.
3. **Key:** `DATABASE_URL`  
   **Value:** paste the **Internal Database URL** from the Postgres **Info** / **Connections** tab (used for service-to-service traffic on Render).
4. Mark as **Secret**. Save and redeploy.

## Option C: Blueprint `fromDatabase` (no password in the repo)

If you manage the stack with a [Render Blueprint](https://render.com/docs/infrastructure-as-code), you can reference an existing Postgres by **name** (the name shown in the dashboard for that database resource):

```yaml
envVars:
  - key: DATABASE_URL
    fromDatabase:
      name: your-postgres-instance-name
      property: connectionString
```

Set `name` to match your PostgreSQL service name in Render. Render resolves the connection string at deploy time. You can also define a `databases:` block in the same blueprint if you want Postgres created from the repo.

See comments in [`render.yaml`](../render.yaml) at the repository root.

## After changing the database URL

- The app runs `python manage.py migrate --noinput` on container start ([`backend/entrypoint.sh`](../backend/entrypoint.sh)).
- Create a production superuser: Render **Shell** on the web service, then `python manage.py createsuperuser` from the backend app directory.

## If credentials were exposed

If a connection string was shared in chat, a ticket, or a screenshot:

1. In Render: **PostgreSQL** → **Credentials** / **Reset password** (or equivalent).
2. Update **`DATABASE_URL`** on the web service (link again, or paste the new internal URL).
3. Redeploy the web service.
