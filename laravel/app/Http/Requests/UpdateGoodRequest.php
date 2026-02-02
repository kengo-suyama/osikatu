<?php

declare(strict_types=1);

namespace App\Http\Requests;

class UpdateGoodRequest extends ApiFormRequest
{
    protected function prepareForValidation(): void
    {
        $data = [];

        $oshiId = $this->input('oshiId', $this->input('oshi_id'));
        if ($oshiId !== null) {
            $data['oshi_id'] = $oshiId;
        }

        $purchaseDate = $this->input('purchaseDate', $this->input('purchase_date'));
        if ($purchaseDate !== null) {
            $data['purchase_date'] = $purchaseDate;
        }

        $imagePath = $this->input('imagePath', $this->input('image_path'));
        if ($imagePath !== null) {
            $data['image_path'] = $imagePath;
        }

        if (!empty($data)) {
            $this->merge($data);
        }
    }

    public function rules(): array
    {
        return [
            'oshi_id' => ['sometimes', 'integer', 'exists:oshis,id'],
            'name' => ['sometimes', 'string', 'max:120'],
            'category' => ['sometimes', 'string', 'max:80'],
            'purchase_date' => ['sometimes', 'date'],
            'price' => ['sometimes', 'integer', 'min:1', 'max:100000000'],
            'image_path' => ['nullable', 'string', 'max:255'],
            'memo' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
