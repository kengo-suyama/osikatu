<?php

declare(strict_types=1);

namespace App\Http\Requests;

class StoreDiaryRequest extends ApiFormRequest
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

        if (!empty($data)) {
            $this->merge($data);
        }
    }

    public function rules(): array
    {
        return [
            'oshi_id' => ['required', 'integer', 'exists:oshis,id'],
            'title' => ['required', 'string', 'max:120'],
            'content' => ['required', 'string', 'max:5000'],
            'diary_date' => ['required', 'date'],
            'is_locked' => ['nullable', 'boolean'],
        ];
    }
}
