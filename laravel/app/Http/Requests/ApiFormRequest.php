<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\ApiResponse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ApiFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function validationData(): array
    {
        $data = $this->all();
        $json = $this->json()->all();
        if (!empty($json)) {
            $data = array_merge($data, $json);
        }
        return $data;
    }

    protected function failedValidation($validator): void
    {
        $response = ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        throw new HttpResponseException($response);
    }
}
