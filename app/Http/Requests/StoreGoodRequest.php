<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGoodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'oshi_id' => [
                'required',
                'integer',
                Rule::exists('oshis', 'id')->where('user_id', $this->user()->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'purchase_date' => ['required', 'date'],
            'price' => ['required', 'integer', 'min:0'],
            'image_path' => ['nullable', 'string', 'max:2048'],
            'memo' => ['nullable', 'string'],
        ];
    }
}
