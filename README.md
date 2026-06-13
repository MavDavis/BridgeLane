# Transparent Donations MVP

Minimal prototype for a transparent donation tracking app for churches/NGOs using Stellar (testnet) for on-chain recording.

Features:
- Create orgs and campaigns
- Record donations in SQLite
- Optionally submit small on-chain payments from a platform testnet account (set `PLATFORM_SEED`)
- Simple dashboard endpoint

Quick start

1. Copy `.env.sample` to `.env` and set `PLATFORM_SEED` if you want testnet on-chain transfers (optional for now):

```bash
cp .env.sample .env
# edit .env and set PLATFORM_SEED to a testnet secret (or leave unset to record off-chain only)
```

2. Install dependencies and start:

```bash
npm install
npm start
```

3. Open `http://localhost:4000` to see the simple UI. Create orgs/campaigns using the API (or extend UI).

API Endpoints (quick)
- `POST /api/orgs` { name }
- `POST /api/campaigns` { org_id, name, goal (integer cents), categories (array) }
- `GET /api/campaigns`
- `GET /api/campaigns/:id`
- `POST /api/donate` { campaign_id, amount (cents), donor_name, category }
- `GET /api/dashboard/:campaignId`

Notes and next steps
- Current flow: server will submit a payment from `PLATFORM_SEED` to the campaign's Stellar account (testnet). In production, prefer donor-signed transactions or custodial flow with KYC.
- Add recurring job runner to process `recurring` table and billing for organizations (monetization).
- Improve frontend for onboarding orgs, campaign creation, and restricted spending tracking.

License: none
