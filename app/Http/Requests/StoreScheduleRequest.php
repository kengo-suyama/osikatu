<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreScheduleRequest extends FormRequest
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
            'description' => ['nullable', 'string', 'max:200'],
            'start_datetime' => ['required', 'date'],
            'end_datetime' => ['nullable', 'date', 'after:start_datetime'],
            'notify_before_minutes' => ['nullable', 'integer', 'min:0', 'max:1440'],
        ];
    }

    public function messages(): array
    {
        return [
            'oshi_id.required' => trans('validation.custom.schedule.oshi_id.required'),
            'oshi_id.integer' => trans('validation.custom.schedule.oshi_id.integer'),
            'oshi_id.exists' => trans('validation.custom.schedule.oshi_id.exists'),
            'title.required' => trans('validation.custom.schedule.title.required'),
            'title.string' => trans('validation.custom.schedule.title.string'),
            'title.max' => trans('validation.custom.schedule.title.max'),
            'description.string' => trans('validation.custom.schedule.description.string'),
            'description.max' => trans('validation.custom.schedule.description.max'),
            'start_datetime.required' => trans('validation.custom.schedule.start_datetime.required'),
            'start_datetime.date' => trans('validation.custom.schedule.start_datetime.date'),
            'end_datetime.date' => trans('validation.custom.schedule.end_datetime.date'),
            'end_datetime.after' => trans('validation.custom.schedule.end_datetime.after'),
            'notify_before_minutes.integer' => trans('validation.custom.schedule.notify_before_minutes.integer'),
            'notify_before_minutes.min' => trans('validation.custom.schedule.notify_before_minutes.min'),
            'notify_before_minutes.max' => trans('validation.custom.schedule.notify_before_minutes.max'),
        ];
    }

    public function attributes(): array
    {
        return [
            'oshi_id' => trans('validation.attributes.schedule.oshi_id'),
            'title' => trans('validation.attributes.schedule.title'),
            'description' => trans('validation.attributes.schedule.description'),
            'start_datetime' => trans('validation.attributes.schedule.start_datetime'),
            'end_datetime' => trans('validation.attributes.schedule.end_datetime'),
            'notify_before_minutes' => trans('validation.attributes.schedule.notify_before_minutes'),
        ];
    }
}
