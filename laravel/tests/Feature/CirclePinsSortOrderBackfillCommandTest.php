<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CirclePin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class CirclePinsSortOrderBackfillCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_backfill_sort_order_command_dry_run_does_not_modify(): void
    {
        $circle = Circle::create([
            'name' => 'Pins Sort Order Backfill Command',
            'plan' => 'plus',
            'plan_required' => 'free',
            'max_members' => 30,
        ]);

        CirclePin::create([
            'circle_id' => $circle->id,
            'created_by_member_id' => null,
            'title' => 'A',
            'url' => null,
            'body' => 'A',
            'sort_order' => null,
            'pinned_at' => now()->subMinute(),
        ]);

        $this->assertSame(1, CirclePin::query()->where('circle_id', $circle->id)->whereNull('sort_order')->count());

        Artisan::call('app:backfill-circle-pins-sort-order', ['--dry-run' => true]);

        $this->assertSame(1, CirclePin::query()->where('circle_id', $circle->id)->whereNull('sort_order')->count());
    }

    public function test_backfill_sort_order_command_fills_null_values(): void
    {
        $circle = Circle::create([
            'name' => 'Pins Sort Order Backfill Command',
            'plan' => 'plus',
            'plan_required' => 'free',
            'max_members' => 30,
        ]);

        CirclePin::create([
            'circle_id' => $circle->id,
            'created_by_member_id' => null,
            'title' => 'older',
            'url' => null,
            'body' => 'older',
            'sort_order' => null,
            'pinned_at' => now()->subHour(),
        ]);
        CirclePin::create([
            'circle_id' => $circle->id,
            'created_by_member_id' => null,
            'title' => 'newer',
            'url' => null,
            'body' => 'newer',
            'sort_order' => null,
            'pinned_at' => now(),
        ]);

        $this->assertSame(2, CirclePin::query()->where('circle_id', $circle->id)->whereNull('sort_order')->count());

        Artisan::call('app:backfill-circle-pins-sort-order');

        $this->assertSame(0, CirclePin::query()->where('circle_id', $circle->id)->whereNull('sort_order')->count());

        $older = CirclePin::query()->where('circle_id', $circle->id)->where('title', 'older')->first();
        $newer = CirclePin::query()->where('circle_id', $circle->id)->where('title', 'newer')->first();

        $this->assertNotNull($older);
        $this->assertNotNull($newer);
        $this->assertNotNull($older->sort_order);
        $this->assertNotNull($newer->sort_order);
        $this->assertLessThan($newer->sort_order, $older->sort_order);
    }
}

