<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Diary;
use App\Models\Good;
use App\Models\Schedule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAttachmentRequest extends FormRequest
{
    public const TYPE_MAP = [
        'diary' => Diary::class,
        'schedule' => Schedule::class,
        'good' => Good::class,
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'related_type' => ['required', 'string', Rule::in(array_keys(self::TYPE_MAP))],
            'related_id' => ['required', 'integer'],
            'file_path' => ['required', 'string', 'max:2048'],
            'file_type' => ['required', 'string', 'max:255'],
        ];
    }

    public function relatedModelClass(): string
    {
        return self::TYPE_MAP[$this->input('related_type')];
    }
}
