# Frontends – ports and how to run

**Backend (required for admin + customer data):**  
Start the API first, or admin and customer will load but show no data:
```bash
cd /path/to/easyfoods && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Leave this running in a terminal. Admin and customer (and other frontends) proxy `/api` to `http://localhost:8000`.

**Run all six at once (from project root):**
```bash
./start-all-frontends.sh
```
Then open the URLs below in your browser. To stop all: `./stop-frontends.sh`

**Or run one at a time:**  
If a frontend doesn’t start (e.g. “Port in use”), run `./stop-frontends.sh` first, then:

| App      | Port | Command |
|----------|------|---------|
| Vendor   | 3000 | `cd frontend-vendor && npm run dev` → http://localhost:3000 |
| Admin    | 3002 | `cd frontend-admin && npm run dev` → http://localhost:3002 |
| Customer | 3003 | `cd frontend-customer && npm run dev` → http://localhost:3003 |
| Delivery | 3004 | `cd frontend-delivery && npm run dev` → http://localhost:3004 |
| Marketing| 3005 | `cd frontend-marketing && npm run dev` → http://localhost:3005 |
| Chef     | 3006 | `cd frontend-chef && npm run dev` → http://localhost:3006 |

Each app is fixed to its port; if that port is taken, the dev server will error instead of switching to another port.
