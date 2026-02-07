<?php

declare(strict_types=1);

namespace App\Http\Requests;

class UpdateDiaryRequest extends ApiFormRequest
{
    protected function prepareForValidation(): void
    {
        $data = [];

        $oshiId = $this->input('oshiId', $this->input('oshi_id'));
        if ($oshiId !== null) {
            $data['oshi_id'] = $oshiId;
        }

        $diaryDate = $this->input('diaryDate', $this->input('diary_date'));
        if ($diaryDate !== null) {
            $data['diary_date'] = $diaryDate;
        }

        if ($this->has('isLocked') || $this->has('is_locked')) {
            $data['is_locked'] = $this->input('isLocked', $this->input('is_locked'));
        }

        // Normalize tags: accept comma-separated string or array
        $tags = $this->input('tags');
        if (is_string($tags)) {
            $data['tags'] = array_values(array_filter(preg_split('/\s*,\s*/', $tags)));
        }

        if (!empty($data)) {
            $this->merge($data);
        }
    }

    public function rules(): array
    {
        return [
            'oshi_id' => ['sometimes', 'integer', 'exists:oshis,id'],
            'title' => ['sometimes', 'string', 'max:120'],
            'content' => ['sometimes', 'string', 'max:5000'],
            'diary_date' => ['sometimes', 'date'],
            'is_locked' => ['sometimes', 'boolean'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
        ];
    }
}
