<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\PersonalMoneyEntry;
use App\Support\CurrentUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonalMoneyLedgerTest extends TestCase
{
    use RefreshDatabase;

    private string $deviceId = 'test-money-device-001';

    private function headers(): array
    {
        return ['X-Device-Id' => $this->deviceId];
    }

    private function getUserId(): int
    {
        // Trigger user creation via the auth system
        $this->getJson('/api/me', $this->headers());
        return CurrentUser::id();
    }

    public function test_create_income_entry(): void
    {
        $response = $this->postJson('/api/me/money', [
            'date' => '2026-02-09',
            'type' => 'income',
            'amount_jpy' => 50000,
            'category' => '給料',
            'note' => '2月分',
        ], $this->headers());

        $response->assertStatus(201);
        $response->assertJsonPath('success.data.type', 'income');
        $response->assertJsonPath('success.data.amountJpy', 50000);
    }

    public function test_create_expense_entry(): void
    {
        $response = $this->postJson('/api/me/money', [
            'date' => '2026-02-09',
            'type' => 'expense',
            'amount_jpy' => 3000,
            'category' => 'グッズ',
        ], $this->headers());

        $response->assertStatus(201);
        $response->assertJsonPath('success.data.type', 'expense');
    }

    public function test_list_with_date_filter(): void
    {
        $userId = $this->getUserId();

        PersonalMoneyEntry::create([
            'user_id' => $userId,
            'date' => '2026-01-15',
            'type' => 'expense',
            'amount_jpy' => 1000,
        ]);
        PersonalMoneyEntry::create([
            'user_id' => $userId,
            'date' => '2026-02-05',
            'type' => 'income',
            'amount_jpy' => 5000,
        ]);

        $response = $this->getJson('/api/me/money?from=2026-02-01&to=2026-02-28', $this->headers());

        $response->assertOk();
        $data = $response->json('success.data');
        $this->assertCount(1, $data);
        $this->assertEquals('income', $data[0]['type']);
    }

    public function test_update_entry(): void
    {
        $userId = $this->getUserId();

        $entry = PersonalMoneyEntry::create([
            'user_id' => $userId,
            'date' => '2026-02-09',
            'type' => 'expense',
            'amount_jpy' => 1000,
            'category' => 'food',
        ]);

        $response = $this->patchJson("/api/me/money/{$entry->id}", [
            'amount_jpy' => 2000,
            'note' => 'updated',
        ], $this->headers());

        $response->assertOk();
        $response->assertJsonPath('success.data.amountJpy', 2000);
    }

    public function test_soft_delete(): void
    {
        $userId = $this->getUserId();

        $entry = PersonalMoneyEntry::create([
            'user_id' => $userId,
            'date' => '2026-02-09',
            'type' => 'expense',
            'amount_jpy' => 500,
        ]);

        $response = $this->deleteJson("/api/me/money/{$entry->id}", [], $this->headers());
        $response->assertOk();

        $this->assertSoftDeleted('personal_money_entries', ['id' => $entry->id]);
    }

    public function test_validation_rejects_invalid_type(): void
    {
        $response = $this->postJson('/api/me/money', [
            'date' => '2026-02-09',
            'type' => 'loan',
            'amount_jpy' => 100,
        ], $this->headers());

        $response->assertStatus(422);
    }
}
