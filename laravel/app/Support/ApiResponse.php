<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;

class ApiResponse
{
    public static function success(
        mixed $data,
        ?array $meta = null,
        int $status = 200
    ): JsonResponse {
        if ($data instanceof JsonResource) {
            $resolved = $data->resolve(request());
            if ($data instanceof ResourceCollection && is_array($resolved) && array_key_exists('data', $resolved)) {
                $resolved = $resolved['data'];
            }
            $data = $resolved;
        }

        $payload = ['success' => ['data' => $data]];
        if ($meta !== null) {
            $payload['success']['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    public static function error(
        string $code,
        string $message,
        mixed $details = null,
        int $status = 400
    ): JsonResponse {
        $payload = [
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
        ];

        if ($details !== null) {
            $payload['error']['details'] = $details;
        }

        return response()->json($payload, $status);
    }
}
