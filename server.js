require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Server, Keypair, TransactionBuilder, Networks, Operation, Asset } = require('stellar-sdk');
const { db, init } = require('./db');
const path = require('path');

const PORT = process.env.PORT || 4000;
const PLATFORM_SEED = process.env.PLATFORM_SEED || null;
const STELLAR_NETWORK = process.env.STELLAR_NETWORK === 'public' ? 'public' : 'testnet';

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

init();

const server = STELLAR_NETWORK === 'public' ? new Server('https://horizon.stellar.org') : new Server('https://horizon-testnet.stellar.org');

function ensurePlatformAccount() {
  if (!PLATFORM_SEED) return null;
  const keypair = Keypair.fromSecret(PLATFORM_SEED);
  return keypair;
}

// Orgs
app.post('/api/orgs', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  // create a Stellar keypair for the org (fund via friendbot for testnet)
  const kp = Keypair.random();
  const accountId = kp.publicKey();

  const stmt = db.prepare('INSERT INTO orgs (name, stellar_account) VALUES (?,?)');
  stmt.run(name, accountId, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, stellar_account: accountId, secret_note: 'prod: create/onboard org with real key management' });
  });
});

// Campaigns
app.post('/api/campaigns', (req, res) => {
  const { org_id, name, goal = 0, categories = [] } = req.body;
  if (!org_id || !name) return res.status(400).json({ error: 'org_id and name required' });

  const stmt = db.prepare('INSERT INTO campaigns (org_id, name, goal, categories) VALUES (?,?,?,?)');
  stmt.run(org_id, name, goal, JSON.stringify(categories), function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, org_id, name, goal, categories });
  });
});

app.get('/api/campaigns', (req, res) => {
  db.all('SELECT c.*, o.name as org_name FROM campaigns c LEFT JOIN orgs o ON c.org_id=o.id', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows = rows.map(r => ({ ...r, categories: r.categories ? JSON.parse(r.categories) : [] }));
    res.json(rows);
  });
});

app.get('/api/campaigns/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM campaigns WHERE id=?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    row.categories = row.categories ? JSON.parse(row.categories) : [];
    db.all('SELECT * FROM donations WHERE campaign_id=?', [id], (e, donations) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json({ ...row, donations });
    });
  });
});

// Donation (server-submitted on-chain for MVP)
app.post('/api/donate', async (req, res) => {
  const { campaign_id, amount, donor_name = 'Anonymous', category = null } = req.body;
  if (!campaign_id || !amount) return res.status(400).json({ error: 'campaign_id and amount required' });

  // find campaign and org
  db.get('SELECT c.*, o.stellar_account, o.id as org_id FROM campaigns c JOIN orgs o ON c.org_id=o.id WHERE c.id=?', [campaign_id], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'campaign not found' });

    const platformKP = ensurePlatformAccount();
    if (!platformKP) {
      // record off-chain only
      const stmt = db.prepare('INSERT INTO donations (campaign_id, amount, donor_name, category, on_chain) VALUES (?,?,?,?,0)');
      stmt.run(campaign_id, amount, donor_name, category, function (e) {
        if (e) return res.status(500).json({ error: e.message });
        return res.json({ id: this.lastID, on_chain: false, note: 'PLATFORM_SEED not set; recorded off-chain only' });
      });
      return;
    }

    try {
      // ensure destination account exists (friendbot on testnet could be used externally)
      const dest = row.stellar_account;

      // load platform account
      const sourceKP = platformKP;
      const sourceAccount = await server.loadAccount(sourceKP.publicKey());

      const tx = new TransactionBuilder(sourceAccount, {
        fee: await server.fetchBaseFee(),
        networkPassphrase: STELLAR_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET
      })
        .addOperation(Operation.payment({
          destination: dest,
          asset: Asset.native(),
          amount: (amount / 100).toFixed(7) // amount in XLM; we expect 'amount' cents, so divide by 100
        }))
        .setTimeout(30)
        .build();

      tx.sign(sourceKP);
      const txResult = await server.submitTransaction(tx);

      const stmt = db.prepare('INSERT INTO donations (campaign_id, amount, donor_name, category, tx_hash, on_chain) VALUES (?,?,?,?,?,1)');
      stmt.run(campaign_id, amount, donor_name, category, txResult.hash, function (e) {
        if (e) return res.status(500).json({ error: e.message });
        res.json({ id: this.lastID, tx_hash: txResult.hash, on_chain: true });
      });
    } catch (ex) {
      res.status(500).json({ error: ex.message });
    }
  });
});

// Dashboard: totals per campaign and categories
app.get('/api/dashboard/:campaignId', (req, res) => {
  const id = req.params.campaignId;
  db.get('SELECT * FROM campaigns WHERE id=?', [id], (err, campaign) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!campaign) return res.status(404).json({ error: 'not found' });
    db.all('SELECT category, SUM(amount) as total FROM donations WHERE campaign_id=? GROUP BY category', [id], (e, rows) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json({ campaign: { ...campaign, categories: campaign.categories ? JSON.parse(campaign.categories) : [] }, breakdown: rows });
    });
  });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
