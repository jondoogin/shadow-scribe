/**
 * api/stripe/create-checkout.js — Stripe checkout session stub.
 *
 * Creates a Stripe Checkout session for Companion Plus subscription.
 * Currently returns 503 until Stripe is configured.
 *
 * To activate:
 *   1. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel environment variables.
 *   2. npm install stripe
 *   3. Replace the stub body below with the Stripe SDK call.
 *
 * Expected request body: { userId: string, email: string, returnUrl: string }
 * Expected response:     { url: string }  — the Stripe-hosted checkout URL
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })

  // ── Stripe integration (uncomment when ready) ───────────────────────────
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  // const { userId, email, returnUrl } = req.body
  //
  // const session = await stripe.checkout.sessions.create({
  //   mode: 'subscription',
  //   customer_email: email,
  //   line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
  //   success_url: returnUrl + '?checkout=success',
  //   cancel_url:  returnUrl + '?checkout=cancelled',
  //   metadata: { userId },
  // })
  // return res.status(200).json({ url: session.url })
  // ────────────────────────────────────────────────────────────────────────

  return res.status(503).json({ error: 'Payments not yet configured.' })
}
