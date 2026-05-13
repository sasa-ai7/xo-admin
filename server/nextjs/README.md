# server/nextjs — DEPRECATED

These files were part of the original xogame-105c9 backend that ran as a Next.js API route.
They are **not used** by the Vite admin dashboard and will not run in a normal Vite/static deployment.

## Replacement

User deletion is now handled by the Firebase callable Cloud Function `adminDeleteUserWithCleanup`
in `/functions/src/index.ts`.

Deploy it with:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions --project xo-arenaneon-clash
```

Set `VITE_ENABLE_ADMIN_DELETE_USER=true` in `.env.local` after deployment.

## Files left here

`app/api/admin/delete-user/route.ts` — kept for historical reference only.
Do not call it from the Vite client.
