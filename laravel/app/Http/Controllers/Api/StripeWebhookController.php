<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingSubscription;
use App\Models\MeProfile;
use App\Models\WebhookEventReceipt;
use App\Support\ApiResponse;
use App\Support\StripeWebhookVerifier;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeObject;

class StripeWebhookController extends Controller
{
    public function handle(Request $request, StripeWebhookVerifier $verifier)
    {
        $secret = config('services.stripe.webhook_secret');

        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature', '');

        $eventId = null;
        $eventType = null;
        $eventData = null;

        // Production MUST have webhook secret configured.
        if (app()->environment('production') && (!is_string($secret) || $secret === '')) {
            Log::critical('billing_webhook_secret_missing_in_production');

            return ApiResponse::error(
                'WEBHOOK_SECRET_MISSING',
                'Stripe webhook secret is not configured. This is required in production.',
                null,
                500
            );
        }

        // Signature verification (when secret is configured).
        if (is_string($secret) && $secret !== '') {
            try {
                $event = $verifier->constructEvent($payload, $signature, $secret);
            } catch (SignatureVerificationException|\UnexpectedValueException $e) {
                Log::warning('billing_webhook_invalid_signature', [
                    'signature' => substr($signature, 0, 30) . '...',
                    'ip' => $request->ip(),
                ]);

                return ApiResponse::error('INVALID_SIGNATURE', 'Webhook signature verification failed.', null, 400);
            }

            $eventId = $event->id ?? null;
            $eventType = $event->type ?? null;
            $eventData = $event->data?->object ?? null;
        } else {
            // Local/dev: accept unsigned payload but keep idempotency & processing consistent.
            Log::warning('billing_webhook_no_signature_verification', [
                'env' => app()->environment(),
                'ip' => $request->ip(),
            ]);
            $data = $request->json()->all();
            $eventId = $data['id'] ?? null;
            $eventType = $data['type'] ?? null;
            $eventData = $data['data']['object'] ?? null;
        }

        if (!$eventId) {
            return ApiResponse::error('MISSING_EVENT_ID', 'Event ID is required.', null, 400);
        }

        Log::info('billing_webhook_received', [
            'stripe_event_id' => $eventId,
            'event_type' => $eventType,
        ]);

        // Idempotency: skip if already processed
        $existing = WebhookEventReceipt::query()
            ->where('stripe_event_id', $eventId)
            ->first();

        if ($existing) {
            Log::info('billing_webhook_duplicate', [
                'stripe_event_id' => $eventId,
            ]);

            return ApiResponse::success(['status' => 'already_processed']);
        }

        // Record receipt
        WebhookEventReceipt::create([
            'stripe_event_id' => $eventId,
            'event_type' => $eventType,
            'status' => 'processed',
        ]);

        // Dispatch based on event type
        $this->processEvent((string) $eventType, $eventData);

        return ApiResponse::success(['status' => 'processed']);
    }

    private function processEvent(string $eventType, mixed $eventData): void
    {
        if ($eventData instanceof StripeObject) {
            $eventData = $eventData->toArray();
        }

        if (!is_array($eventData)) {
            Log::warning('billing_webhook_unexpected_payload', [
                'event_type' => $eventType,
            ]);
            return;
        }

        if (in_array($eventType, [
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
        ], true)) {
            $this->upsertSubscriptionFromStripe($eventData);
        } elseif ($eventType === 'checkout.session.completed') {
            $this->upsertSubscriptionFromCheckoutSession($eventData);
        }

        Log::info('billing_webhook_processed', [
            'event_type' => $eventType,
        ]);
    }

    private function upsertSubscriptionFromStripe(array $sub): void
    {
        $stripeSubId = $sub['id'] ?? null;
        $customerId = $sub['customer'] ?? null;
        if (!is_string($stripeSubId) || $stripeSubId === '') {
            return;
        }

        $metadata = is_array($sub['metadata'] ?? null) ? $sub['metadata'] : [];

        $userId = null;
        $metaUserId = $metadata['user_id'] ?? null;
        if (is_string($metaUserId) && ctype_digit($metaUserId)) {
            $userId = (int) $metaUserId;
        } elseif (is_int($metaUserId)) {
            $userId = $metaUserId;
        }

        if (!$userId) {
            $metaDeviceId = $metadata['device_id'] ?? null;
            if (is_string($metaDeviceId) && $metaDeviceId !== '') {
                $profile = MeProfile::query()->where('device_id', $metaDeviceId)->first();
                if ($profile?->user_id) {
                    $userId = (int) $profile->user_id;
                }
            }
        }

        if (!$userId && is_string($customerId) && $customerId !== '') {
            $existing = BillingSubscription::query()
                ->where('stripe_customer_id', $customerId)
                ->where('plan', 'plus')
                ->first();
            if ($existing) {
                $userId = (int) $existing->user_id;
            }
        }

        if (!$userId) {
            Log::warning('billing_webhook_subscription_user_unknown', [
                'stripe_subscription_id' => $stripeSubId,
                'stripe_customer_id' => $customerId,
            ]);
            return;
        }

        $status = is_string($sub['status'] ?? null) ? (string) $sub['status'] : 'unknown';
        $cancelAtPeriodEnd = (bool) ($sub['cancel_at_period_end'] ?? false);

        $periodEnd = null;
        $rawEnd = $sub['current_period_end'] ?? null;
        if (is_int($rawEnd)) {
            $periodEnd = Carbon::createFromTimestamp($rawEnd);
        } elseif (is_string($rawEnd) && ctype_digit($rawEnd)) {
            $periodEnd = Carbon::createFromTimestamp((int) $rawEnd);
        }

        $model = BillingSubscription::query()
            ->where('stripe_subscription_id', $stripeSubId)
            ->first();

        if (!$model) {
            $model = BillingSubscription::query()
                ->where('user_id', $userId)
                ->where('plan', 'plus')
                ->first();
        }

        if (!$model) {
            $model = new BillingSubscription([
                'user_id' => $userId,
                'plan' => 'plus',
            ]);
        }

        $model->stripe_customer_id = is_string($customerId) ? $customerId : $model->stripe_customer_id;
        $model->stripe_subscription_id = $stripeSubId;
        $model->status = $status;
        $model->current_period_end = $periodEnd;
        $model->cancel_at_period_end = $cancelAtPeriodEnd;
        $model->save();
    }

    private function upsertSubscriptionFromCheckoutSession(array $session): void
    {
        $stripeSubId = $session['subscription'] ?? null;
        $customerId = $session['customer'] ?? null;

        if (!is_string($stripeSubId) || $stripeSubId === '') {
            return;
        }

        $userId = null;
        $clientRef = $session['client_reference_id'] ?? null;
        if (is_string($clientRef) && ctype_digit($clientRef)) {
            $userId = (int) $clientRef;
        }

        $metadata = is_array($session['metadata'] ?? null) ? $session['metadata'] : [];
        if (!$userId) {
            $metaUserId = $metadata['user_id'] ?? null;
            if (is_string($metaUserId) && ctype_digit($metaUserId)) {
                $userId = (int) $metaUserId;
            }
        }

        if (!$userId) {
            return;
        }

        $model = BillingSubscription::query()
            ->where('stripe_subscription_id', $stripeSubId)
            ->first();

        if (!$model) {
            $model = BillingSubscription::query()
                ->where('user_id', $userId)
                ->where('plan', 'plus')
                ->first();
        }

        if (!$model) {
            $model = new BillingSubscription([
                'user_id' => $userId,
                'plan' => 'plus',
            ]);
        }

        if (is_string($customerId) && $customerId !== '') {
            $model->stripe_customer_id = $customerId;
        }
        $model->stripe_subscription_id = $stripeSubId;
        $model->save();
    }
}
