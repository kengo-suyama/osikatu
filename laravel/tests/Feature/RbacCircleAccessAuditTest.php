<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RBAC audit: verify non-members cannot access circle-scoped resources.
 */
class RbacCircleAccessAuditTest extends TestCase
{
    use RefreshDatabase;

    private User $nonMember;
    private Circle $circle;

    protected function setUp(): void
    {
        parent::setUp();

        $owner = User::factory()->create(['plan' => 'plus']);
        $this->circle = Circle::factory()->create(['plan' => 'plus']);
        CircleMember::create([
            'circle_id' => $this->circle->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        // non-member user
        $this->nonMember = User::factory()->create(['plan' => 'free']);
    }

    private function asNonMember(): self
    {
        return $this->withHeaders(['X-Device-Id' => 'dev-rbac-nonmember']);
    }

    public function test_non_member_cannot_view_circle_pins(): void
    {
        $r = $this->asNonMember()->getJson("/api/circles/{$this->circle->id}/pins");
        $this->assertContains($r->getStatusCode(), [403, 404]);
    }

    public function test_non_member_cannot_view_circle_settlements(): void
    {
        $r = $this->asNonMember()->getJson("/api/circles/{$this->circle->id}/settlements");
        $this->assertContains($r->getStatusCode(), [402, 403, 404]);
    }

    public function test_non_member_cannot_view_circle_calendar(): void
    {
        $r = $this->asNonMember()->getJson("/api/circles/{$this->circle->id}/calendar");
        $this->assertContains($r->getStatusCode(), [403, 404]);
    }

    public function test_non_member_cannot_view_circle_logs(): void
    {
        $r = $this->asNonMember()->getJson("/api/circles/{$this->circle->id}/logs");
        $this->assertContains($r->getStatusCode(), [402, 403, 404]);
    }

    public function test_non_member_cannot_view_circle_chat(): void
    {
        $r = $this->asNonMember()->getJson("/api/circles/{$this->circle->id}/chat/messages");
        $this->assertContains($r->getStatusCode(), [403, 404]);
    }

    public function test_non_member_cannot_post_to_circle_chat(): void
    {
        $r = $this->asNonMember()->postJson("/api/circles/{$this->circle->id}/chat/messages", [
            'body' => 'test',
        ]);
        $this->assertContains($r->getStatusCode(), [403, 404]);
    }

    public function test_non_member_cannot_create_circle_pin(): void
    {
        $r = $this->asNonMember()->postJson("/api/circles/{$this->circle->id}/pins", [
            'title' => 'test', 'body' => 'test',
        ]);
        $this->assertContains($r->getStatusCode(), [403, 404]);
    }

    public function test_non_member_cannot_view_owner_dashboard(): void
    {
        $r = $this->asNonMember()->getJson("/api/circles/{$this->circle->id}/owner-dashboard");
        $this->assertContains($r->getStatusCode(), [402, 403, 404]);
    }
}
