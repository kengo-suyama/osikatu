<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WebhookEventReceipt;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $secret = config('services.stripe.webhook_secret');

        // Signature verification
        if ($secret) {
            $signature = $request->header('Stripe-Signature', '');
            $payload = $request->getContent();

            if (!$this->verifySignature($payload, $signature, $secret)) {
                Log::warning('billing_webhook_invalid_signature', [
                    'signature' => substr($signature, 0, 30) . '...',
                    'ip' => $request->ip(),
                ]);

                return ApiResponse::error('INVALID_SIGNATURE', 'Webhook signature verification failed.', null, 400);
            }
        }

        $data = $request->json()->all();
        $eventId = $data['id'] ?? null;
        $eventType = $data['type'] ?? null;

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
        $this->processEvent($eventType, $data);

        return ApiResponse::success(['status' => 'processed']);
    }

    private function processEvent(string $eventType, array $data): void
    {
        // Future: handle checkout.session.completed, customer.subscription.updated, etc.
        Log::info('billing_webhook_processed', [
            'event_type' => $eventType,
        ]);
    }

    private function verifySignature(string $payload, string $header, string $secret): bool
    {
        if (!$header) {
            return false;
        }

        $parts = [];
        foreach (explode(',', $header) as $item) {
            $kv = explode('=', trim($item), 2);
            if (count($kv) === 2) {
                $parts[$kv[0]] = $kv[1];
            }
        }

        $timestamp = $parts['t'] ?? null;
        $signature = $parts['v1'] ?? null;

        if (!$timestamp || !$signature) {
            return false;
        }

        // Tolerance: 5 minutes
        if (abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $signedPayload = "{$timestamp}.{$payload}";
        $expected = hash_hmac('sha256', $signedPayload, $secret);

        return hash_equals($expected, $signature);
    }
}
