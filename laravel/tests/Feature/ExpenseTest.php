<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Expense',
            'initial' => 'E',
        ]);
    }

    public function test_can_create_expense(): void
    {
        $profile = $this->createProfile('device-expense-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Test Oshi',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/expenses', [
                'oshiId' => $oshi->id,
                'category' => 'グッズ',
                'amount' => 2400,
                'expenseDate' => '2026-02-01',
                'memo' => '限定版',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success.data.category', 'グッズ')
            ->assertJsonPath('success.data.amount', 2400);

        $this->assertDatabaseCount(Expense::class, 1);
    }
}
