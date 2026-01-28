<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDiaryRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:50'],
            'content' => ['required', 'string'],
            'diary_date' => ['required', 'date'],
            'is_locked' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'oshi_id.required' => trans('validation.custom.diary.oshi_id.required'),
            'oshi_id.integer' => trans('validation.custom.diary.oshi_id.integer'),
            'oshi_id.exists' => trans('validation.custom.diary.oshi_id.exists'),
            'title.required' => trans('validation.custom.diary.title.required'),
            'title.string' => trans('validation.custom.diary.title.string'),
            'title.max' => trans('validation.custom.diary.title.max'),
            'content.required' => trans('validation.custom.diary.content.required'),
            'content.string' => trans('validation.custom.diary.content.string'),
            'diary_date.required' => trans('validation.custom.diary.diary_date.required'),
            'diary_date.date' => trans('validation.custom.diary.diary_date.date'),
            'is_locked.boolean' => trans('validation.custom.diary.is_locked.boolean'),
        ];
    }

    public function attributes(): array
    {
        return [
            'oshi_id' => trans('validation.attributes.diary.oshi_id'),
            'title' => trans('validation.attributes.diary.title'),
            'content' => trans('validation.attributes.diary.content'),
            'diary_date' => trans('validation.attributes.diary.diary_date'),
            'is_locked' => trans('validation.attributes.diary.is_locked'),
        ];
    }
}
