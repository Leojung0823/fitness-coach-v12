#!/usr/bin/env bash
set -euo pipefail

# Ship main to production: database first, then the app.
#
# The order is not a preference. Migrations add the functions the new build
# calls, so an app deployed ahead of its schema shows errors on screens that
# worked a minute earlier. Going the other way is safe: the old build simply
# does not call the new functions yet.
#
# Requires the Supabase database password (Dashboard → Settings → Database).
# The CLI prompts for it with the input hidden -- do not pass it on the command
# line, where it would land in shell history and the process list.

cd "$(dirname "$0")/.."

echo "==> Verifying the build before touching anything"
npm run typecheck
npm run lint
npm run build

echo
echo "==> Applying migrations to the linked Supabase project"
echo "    (the password prompt below is the database password, not your login)"
npx supabase db push --linked

echo
echo "==> Deploying to production"
npx vercel deploy --prod

echo
echo "==> Checking what actually went live"
sleep 5
health=$(curl -s -o /dev/null -w '%{http_code}' https://coach-note-rho.vercel.app/auth/callback)
if [ "$health" = "404" ]; then
  echo "    /auth/callback still answers 404 -- the deployment did not take effect."
  exit 1
fi
echo "    /auth/callback answers $health (307 = the route is live and redirecting)"
echo
echo "Done. Two settings still have to be made by hand in the Supabase dashboard;"
echo "see README 「信件連結設定（hosted 專案必做）」."
