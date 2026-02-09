<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseCategorySummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_includes_by_category(): void
    {
        $user = User::factory()->create();

        $profile = MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'device-cat-test',
            'nickname' => 'CatTester',
        ]);

        $oshi = Oshi::create([
            'user_id' => $user->id,
            'name' => 'Test Oshi',
        ]);

        Expense::create([
            'user_id' => $user->id,
            'oshi_id' => $oshi->id,
            'category' => 'グッズ',
            'amount' => 3000,
            'expense_date' => now()->format('Y-m-d'),
        ]);

        Expense::create([
            'user_id' => $user->id,
            'oshi_id' => $oshi->id,
            'category' => '現場',
            'amount' => 5000,
            'expense_date' => now()->format('Y-m-d'),
        ]);

        Expense::create([
            'user_id' => $user->id,
            'oshi_id' => $oshi->id,
            'category' => 'グッズ',
            'amount' => 2000,
            'expense_date' => now()->format('Y-m-d'),
        ]);

        $response = $this->getJson('/api/me/expenses-summary?month=' . now()->format('Y-m'), [
            'X-Device-Id' => 'device-cat-test',
        ]);

        $response->assertStatus(200);
        $data = $response->json('success.data');

        $this->assertEquals(10000, $data['totalAmount']);
        $this->assertArrayHasKey('byCategory', $data);

        $cats = collect($data['byCategory']);
        $this->assertEquals(2, $cats->count());

        // Sorted by totalAmount desc: 現場=5000, グッズ=5000 (tied, order may vary)
        $catNames = $cats->pluck('category')->sort()->values()->all();
        $this->assertEquals(['グッズ', '現場'], $catNames);

        $catTotals = $cats->pluck('totalAmount')->sort()->values()->all();
        $this->assertEquals([5000, 5000], $catTotals);
    }

    public function test_summary_empty_month_has_empty_by_category(): void
    {
        $user = User::factory()->create();

        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'device-cat-empty',
            'nickname' => 'EmptyTester',
        ]);

        $response = $this->getJson('/api/me/expenses-summary?month=2020-01', [
            'X-Device-Id' => 'device-cat-empty',
        ]);

        $response->assertStatus(200);
        $data = $response->json('success.data');
        $this->assertEquals(0, $data['totalAmount']);
        $this->assertEmpty($data['byCategory']);
    }
}
