# GFAS — Global Freight Automation System
### Multi-tenant SaaS for Freight Forwarders & 3PLs

## Quick Start (One Command)
```bash
bash start-demo.sh
```
##
## Manual Start
```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Backend
cd backend
npm install
npm run seed:demo
npm run start:dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## URLs
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Swagger Docs | http://localhost:3001/api/docs |
| MailHog (emails) | http://localhost:8025 |
| MinIO (files) | http://localhost:9001 |

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gtp.com | Admin@123 |
| Agent | agent@gtp.com | Agent@123 |
| Warehouse | warehouse@gtp.com | Ware@123 |

## Demo Flow (show client this sequence)
1. Login as admin@gtp.com
2. Dashboard shows 5 real shipments with live stats
3. Click SHP-2025-0001 → view full shipment detail
4. Go to Documents tab → download the House Bill of Lading PDF
5. Go to Tracking tab → see 5 tracking events timeline
6. Create new shipment using "+ New Shipment" button
7. Generate a Commercial Invoice PDF for the new shipment
8. Go to Documents page → see all documents across shipments

## Modules Built
- ✅ Authentication (JWT, 3 roles)
- ✅ Dashboard (KPI stats, alerts, shipments table)
- ✅ Shipments (list, detail, create, status tracking)
- ✅ Documents (generate PDF, download, void)
- ✅ Tracking (event timeline per shipment)
- ✅ Warehouse (demo view)
- ✅ Demo seed data (5 shipments, 3 users, 5 parties)
