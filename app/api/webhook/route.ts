import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const season = session.metadata?.season;

    if (!userId || !season) {
      console.error('Missing metadata in checkout session:', session.id);
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from('purchases').insert({
      user_id: userId,
      stripe_session_id: session.id,
      season,
    });

    if (error) {
      // Duplicate session_id means this webhook was already processed
      if (error.code === '23505') {
        return NextResponse.json({ received: true });
      }
      console.error('Failed to insert purchase:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
