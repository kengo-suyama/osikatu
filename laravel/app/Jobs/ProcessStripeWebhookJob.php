<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\BillingSubscription;
use App\Models\MeProfile;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessStripeWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly string $eventId,
        public readonly string $eventType,
        public readonly array $eventData,
        public readonly ?string $requestId = null,
    ) {}

    public function handle(): void
    {
        Log::info('stripe_webhook_job_processing', [
            'stripe_event_id' => $this->eventId,
            'event_type' => $this->eventType,
            'request_id' => $this->requestId,
        ]);

        if (in_array($this->eventType, [
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
        ], true)) {
            $this->upsertSubscriptionFromStripe($this->eventData);
        } elseif ($this->eventType === 'checkout.session.completed') {
            $this->upsertSubscriptionFromCheckoutSession($this->eventData);
        }

        Log::info('stripe_webhook_job_completed', [
            'stripe_event_id' => $this->eventId,
            'event_type' => $this->eventType,
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('stripe_webhook_job_failed', [
            'stripe_event_id' => $this->eventId,
            'event_type' => $this->eventType,
            'request_id' => $this->requestId,
            'error' => $exception->getMessage(),
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
            Log::warning('stripe_webhook_job_user_unknown', [
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
