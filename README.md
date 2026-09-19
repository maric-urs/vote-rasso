# vote-rasso

Application de vote — **Rasso Péléen Auto-Camion** (20 septembre 2026).

Votes ouverts jusqu’à **20h (heure Martinique)** le jour de l’événement.

## Stack

- Vue 3 + Vite + TypeScript
- API Vercel Serverless
- Upstash Redis (production)

## Dev

```bash
npm install
npm run dev
```

## Deploy

```bash
npx vercel --prod
```

Variables d’environnement (Vercel) :

- `ADMIN_PIN`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (recommandé)
- optionnel : clés SIV / RapidAPI
