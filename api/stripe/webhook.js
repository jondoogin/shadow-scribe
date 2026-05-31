/**
 * api/stripe/webhook.js — Stripe webhook handler stub.
 *
 * Receives Stripe events and updates the `subscriptions` table in Supabase.
 * Currently acknowledges all events without processing them.
 *
 * To activate:
 *   1. Set STRIPE_WEBHOOK_SECRET in Vercel environment variables.
 *   2. Set SUPABASE_SERVICE_ROLE_KEY (needed to bypass RLS for server writes).
 *   3. npm install stripe @supabase/supabase-js
 *   4. Replace the stub body below with the event handlers.
 *
 * Key events to handle:
 *   - checkout.session.completed    → upsert subscription row, set tier = 'companion_plus'
 *   - customer.subscription.deleted → set tier = 'free', status = 'canceled'
 *   - customer.subscription.updated → update status + current_period_end
 *   - invoice.payment_failed        → set status = 'past_due'
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })

  // ── Stripe webhook verification (uncomment when ready) ──────────────────
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  // const sig    = req.headers['stripe-signature']
  // let event
  // try {
  //   event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  // } catch (err) {
  //   return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` })
  // }
  //
  // switch (event.type) {
  //   case 'checkout.session.completed': {
  //     const session = event.data.object
  //     // upsert subscription row in Supabase using service role key
  //     break
  //   }
  //   case 'customer.subscription.deleted': { /* set tier = 'free' */ break }
  //   case 'customer.subscription.updated': { /* update status */ break }
  //   case 'invoice.payment_failed':        { /* set status = 'past_due' */ break }
  // }
  // ────────────────────────────────────────────────────────────────────────

  // Acknowledge receipt — Stripe requires a 200 within 5 seconds
  return res.status(200).json({ received: true })
}
