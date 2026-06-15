# Transparent Donations MVP

Transparent donation tracking for churches and NGOs powered by Stellar.

This MVP enables organizations to create fundraising campaigns, receive donations, and record donation activity with optional on-chain settlement using the Stellar testnet.

## Why This Exists

Many churches and nonprofit organizations struggle with donor trust and transparency. Donors often have limited visibility into:

* Where funds are allocated
* Campaign progress
* Spending accountability
* Donation history

Transparent Donations aims to improve trust through verifiable donation records and transparent campaign tracking, with blockchain-backed recording as an optional layer.

## Features

### Organization Management

* Create and manage churches or NGOs
* Create fundraising campaigns per organization

### Donation Tracking

* Record donations in SQLite
* Associate donations with campaigns
* Categorize donations

### Stellar Testnet Integration

* Optionally submit on-chain testnet payments
* Record verifiable payment activity on Stellar
* Uses a platform-funded account for MVP testing

### Dashboard

* View campaign details
* Track donation activity
* Access campaign metrics through dashboard endpoints

---

## Current MVP Scope

This is an early prototype focused on validating the donation transparency workflow.

Current implementation includes:

* Basic organization management
* Campaign creation
* Donation recording
* Optional Stellar testnet transactions
* Simple dashboard endpoints

Not yet included:

* Authentication
* Role-based access control
* Production payment flow
* Donor wallet signing
* Restricted spending verification
* Advanced analytics

---

## Architecture Overview

```txt
Frontend/UI
    ↓
Express API
    ↓
SQLite Database
    ↓
Stellar Testnet (optional)
```

### Key Components

#### API Server

Handles:

* Organization creation
* Campaign management
* Donation processing
* Dashboard aggregation

#### Database

SQLite is used for lightweight local persistence during MVP development.

#### Stellar Integration

If configured, the server submits a testnet payment from a platform account to a campaign Stellar account.

For production, donor-signed transactions or a compliant custodial payment flow should be used.

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd transparent-donations
```

### 2. Configure environment variables

Copy the sample environment file:

```bash
cp .env.sample .env
```

Edit `.env` and optionally configure:

```env
PLATFORM_SEED=
```

`PLATFORM_SEED` should be a Stellar **testnet** secret key.

If omitted, donations will still be recorded off-chain.

### 3. Install dependencies

```bash
npm install
```

### 4. Start the application

```bash
npm start
```

### 5. Open the app

Visit:

```txt
http://localhost:4000
```

---

## API Endpoints

### Organizations

Create an organization

```http
POST /api/orgs
```

Request body:

```json
{
  "name": "Celebration Church"
}
```

---

### Campaigns

Create a campaign

```http
POST /api/campaigns
```

Request body:

```json
{
  "org_id": 1,
  "name": "Community Outreach",
  "goal": 100000,
  "categories": ["food", "medical"]
}
```

Get all campaigns

```http
GET /api/campaigns
```

Get a campaign

```http
GET /api/campaigns/:id
```

---

### Donations

Create a donation

```http
POST /api/donate
```

Request body:

```json
{
  "campaign_id": 1,
  "amount": 5000,
  "donor_name": "John Doe",
  "category": "food"
}
```

---

### Dashboard

Get campaign dashboard data

```http
GET /api/dashboard/:campaignId
```

---

## Environment Variables

| Variable        | Description                                              | Required |
| --------------- | -------------------------------------------------------- | -------- |
| `PLATFORM_SEED` | Stellar testnet account secret for on-chain transactions | No       |

---

## Roadmap

### Phase 1 — MVP

* [x] Organization creation
* [x] Campaign management
* [x] Donation recording
* [x] Stellar testnet support
* [x] Dashboard endpoint

### Phase 2 — Platform

* [ ] Authentication
* [ ] Organization onboarding
* [ ] Campaign UI
* [ ] Donor accounts
* [ ] Recurring donations

### Phase 3 — Transparency Layer

* [ ] Restricted spending categories
* [ ] Expense verification
* [ ] Public transparency dashboards
* [ ] Donation impact reporting

### Phase 4 — Monetization

* [ ] Organization subscriptions
* [ ] Premium analytics
* [ ] Recurring billing

## Security Notes

The current implementation uses a server-side platform account for testnet transfers.

For production:

* Avoid storing production signing keys directly in the server
* Prefer donor-signed transactions
* Add KYC/compliance where required
* Implement proper access control and auditing

## License

No license specified.
