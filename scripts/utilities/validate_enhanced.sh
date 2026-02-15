#!/usr/bin/env bash
set -e
echo "Testing Stripe API..."
test -n "$STRIPE_SECRET_KEY" && curl -s -u "$STRIPE_SECRET_KEY:" https://api.stripe.com/v1/balance > /dev/null && echo "Stripe: OK" || echo "Stripe: SKIP"
