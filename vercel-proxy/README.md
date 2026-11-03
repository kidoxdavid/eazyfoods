# eazyfoods.ca front door (Vercel proxy)

A stopgap so `eazyfoods.ca` shows the app without "onrender" appearing in the address bar. It contains no app code: `vercel.json` forwards every request to the Render service and sends `www.eazyfoods.ca` to `eazyfoods.ca`.

Set up (in Vercel):
1. Add New, Project, import this repository.
2. Root Directory: `vercel-proxy`. Framework Preset: Other. No build command. Deploy.
3. Remove `eazyfoods.ca` from the old project (Settings, Domains), then add it to this one.
4. In Render, set the environment variable `WEB_ORIGIN` to `https://eazyfoods.ca` and redeploy.

Limits: Vercel's free plan is for non-commercial use, and very large uploads or long-lived live-update connections may be cut off through a proxy. Move to a Render custom domain before taking real orders, then delete this project.
