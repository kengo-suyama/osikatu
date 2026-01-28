<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMediaLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'platform' => ['required', 'string', Rule::in(['x', 'instagram', 'tiktok'])],
            'url' => ['required', 'url', 'max:2048'],
            'oshi_id' => [
                'nullable',
                'integer',
                Rule::exists('oshis', 'id')->where('user_id', $this->user()->id),
            ],
            'memo' => ['nullable', 'string'],
        ];
    }
}
