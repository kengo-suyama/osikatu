<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SendGridEventReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SendGridEventWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $token = config('services.sendgrid.event_webhook_token');

        if (!is_string($token) || $token === '') {
            if (app()->environment('production')) {
                Log::critical('sendgrid_event_webhook_token_missing');
                return response()->json(['error' => 'Service unavailable'], 503);
            }
        } else {
            $authHeader = $request->header('Authorization', '');
            $expected = 'Bearer ' . $token;
            if (!hash_equals($expected, (string) $authHeader)) {
                Log::warning('sendgrid_event_webhook_unauthorized');
                return response()->json(['error' => 'Unauthorized'], 401);
            }
        }

        $events = $request->json()->all();
        if (!is_array($events)) {
            return response()->json(['error' => 'Invalid payload'], 400);
        }

        $stored = 0;
        foreach ($events as $event) {
            if (!is_array($event)) {
                continue;
            }

            $eventType = (string) ($event['event'] ?? 'unknown');
            $email = (string) ($event['email'] ?? '');
            $sgEventId = isset($event['sg_event_id']) ? (int) $event['sg_event_id'] : null;
            $timestamp = isset($event['timestamp']) ? \Carbon\Carbon::createFromTimestamp((int) $event['timestamp']) : null;

            SendGridEventReceipt::create([
                'event_type' => $eventType,
                'email' => $email,
                'sg_event_id' => $sgEventId,
                'event_timestamp' => $timestamp,
                'raw_payload' => $event,
            ]);

            $stored++;
        }

        Log::info('sendgrid_event_webhook_processed', ['count' => $stored]);

        return response()->json(['ok' => true, 'stored' => $stored]);
    }
}
