<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\BillAssignment;
use App\Models\Circle;
use App\Models\CircleJoinRequest;
use App\Models\CircleMember;
use App\Models\CircleNotice;
use App\Models\CirclePlan;
use App\Models\MeProfile;
use App\Models\NoticeAck;
use App\Models\PlanRsvp;
use App\Models\Post;
use App\Models\PostAck;
use App\Models\SplitBill;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class OwnerDashboardDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $ownerUser = User::updateOrCreate(
            ['email' => 'owner@example.com'],
            ['name' => 'Owner', 'password' => Hash::make('password'), 'plan' => 'plus']
        );

        $circle = Circle::updateOrCreate(
            ['name' => '遠征班'],
            [
                'description' => 'OwnerDashboard デモ用サークル',
                'oshi_label' => '遠征',
                'oshi_tag' => 'demo',
                'oshi_tags' => ['demo', '遠征'],
                'max_members' => 30,
                'plan' => 'plus',
                'is_public' => true,
                'plan_required' => 'free',
                'last_activity_at' => $now,
                'created_by' => $ownerUser->id,
            ]
        );

        $ownerProfile = MeProfile::updateOrCreate(
            ['device_id' => 'demo-device-001'],
            ['nickname' => 'Owner', 'initial' => 'O', 'user_id' => $ownerUser->id]
        );

        $ownerMember = CircleMember::updateOrCreate(
            ['circle_id' => $circle->id, 'user_id' => $ownerUser->id],
            [
                'me_profile_id' => $ownerProfile->id,
                'role' => 'owner',
                'joined_at' => $now,
            ]
        );

        $names = ['Aoi', 'Miki', 'Ren', 'Yui', 'Sora', 'Hana', 'Kaito', 'Riku', 'Mao'];
        $members = [];

        foreach ($names as $index => $name) {
            $user = User::firstOrCreate(
                ['email' => strtolower($name) . '@example.com'],
                ['name' => $name, 'password' => Hash::make('password')]
            );

            $avatarUrl = $name === 'Miki' ? 'http://localhost:8000/storage/avatars/miki.png' : null;

            $profile = MeProfile::updateOrCreate(
                ['device_id' => sprintf('demo-device-%03d', $index + 2)],
                [
                    'nickname' => $name,
                    'initial' => substr($name, 0, 1),
                    'avatar_url' => $avatarUrl,
                    'user_id' => $user->id,
                ]
            );

            $role = $index === 0 ? 'admin' : 'member';

            $member = CircleMember::updateOrCreate(
                ['circle_id' => $circle->id, 'user_id' => $user->id],
                [
                    'me_profile_id' => $profile->id,
                    'role' => $role,
                    'joined_at' => $now,
                ]
            );

            $members[] = $member;
        }

        $notice = CircleNotice::updateOrCreate(
            ['circle_id' => $circle->id, 'is_active' => true],
            [
                'title' => '入金期限（○○公演）',
                'body' => '期限内に入金をお願いします。',
                'due_at' => $now->copy()->addDays(3),
            ]
        );

        $ackedMembers = array_slice($members, 0, 2);
        foreach ($ackedMembers as $member) {
            NoticeAck::updateOrCreate(
                ['notice_id' => $notice->id, 'circle_member_id' => $member->id],
                ['acked_at' => $now->copy()->subHours(2)]
            );
        }

        $bill = SplitBill::updateOrCreate(
            ['circle_id' => $circle->id, 'is_active' => true],
            [
                'title' => '遠征費精算',
                'due_at' => $now->copy()->addDays(2),
            ]
        );

        $assignments = [
            ['member' => $members[0] ?? $ownerMember, 'amount' => 6800, 'paid' => false],
            ['member' => $members[1] ?? $ownerMember, 'amount' => 5200, 'paid' => true],
            ['member' => $members[2] ?? $ownerMember, 'amount' => 3100, 'paid' => false],
        ];

        foreach ($assignments as $assignment) {
            BillAssignment::updateOrCreate(
                [
                    'bill_id' => $bill->id,
                    'circle_member_id' => $assignment['member']->id,
                ],
                [
                    'amount_yen' => $assignment['amount'],
                    'paid_at' => $assignment['paid'] ? $now->copy()->subDay() : null,
                ]
            );
        }

        $plan = CirclePlan::updateOrCreate(
            ['circle_id' => $circle->id, 'is_active' => true],
            [
                'title' => '集合時間アンケート',
                'event_at' => $now->copy()->addDays(1),
            ]
        );

        $rsvpTargets = [
            ['member' => $members[0] ?? $ownerMember, 'status' => 'yes'],
            ['member' => $members[1] ?? $ownerMember, 'status' => 'maybe'],
            ['member' => $members[2] ?? $ownerMember, 'status' => 'no'],
            ['member' => $members[3] ?? $ownerMember, 'status' => null],
        ];

        foreach ($rsvpTargets as $rsvp) {
            PlanRsvp::updateOrCreate(
                [
                    'plan_id' => $plan->id,
                    'circle_member_id' => $rsvp['member']->id,
                ],
                [
                    'status' => $rsvp['status'],
                    'updated_at' => $now,
                ]
            );
        }

        $pinnedPost = Post::firstOrCreate(
            [
                'circle_id' => $circle->id,
                'is_pinned' => true,
                'pin_kind' => 'reminder',
                'body' => '【確認お願いします】集合時間の最終確認をお願いします。',
            ],
            [
                'author_member_id' => $ownerMember->id,
                'user_id' => $ownerMember->user_id,
                'post_type' => 'post',
                'tags' => [],
                'pin_due_at' => $now->copy()->addDays(1),
                'like_count' => 0,
                'created_at' => $now->copy()->subHours(3),
                'updated_at' => $now->copy()->subHours(3),
            ]
        );

        $ackTargets = array_slice($members, 0, 2);
        foreach ($ackTargets as $member) {
            PostAck::updateOrCreate(
                ['post_id' => $pinnedPost->id, 'circle_member_id' => $member->id],
                ['acked_at' => $now->copy()->subHours(2)]
            );
        }

        $posts = [
            [
                'member' => $members[0] ?? $ownerMember,
                'body' => '宿と交通手段の候補をまとめました。確認お願いします！',
                'minutes' => 300,
            ],
            [
                'member' => $members[1] ?? $ownerMember,
                'body' => 'チケットの発券タイミング共有です。前日17時まで。',
                'minutes' => 260,
            ],
        ];

        foreach ($posts as $post) {
            Post::firstOrCreate(
                [
                    'circle_id' => $circle->id,
                    'body' => $post['body'],
                    'post_type' => 'post',
                ],
                [
                    'author_member_id' => $post['member']->id,
                    'user_id' => $post['member']->user_id,
                    'tags' => [],
                    'is_pinned' => false,
                    'pin_kind' => null,
                    'pin_due_at' => null,
                    'like_count' => 0,
                    'created_at' => $now->copy()->subMinutes($post['minutes']),
                    'updated_at' => $now->copy()->subMinutes($post['minutes']),
                ]
            );
        }

        $chatMessages = [
            ['member' => $ownerMember, 'text' => '明日の集合って10時でOK？', 'minutes' => 120],
            ['member' => $members[0] ?? $ownerMember, 'text' => '私は10時で大丈夫！', 'minutes' => 115],
            ['member' => $members[1] ?? $ownerMember, 'text' => 'もう少し遅めでもいけます〜', 'minutes' => 110],
            ['member' => $members[2] ?? $ownerMember, 'text' => '会場近くで合流でもOKです', 'minutes' => 105],
            ['member' => $ownerMember, 'text' => 'じゃあ10時集合で進めます！', 'minutes' => 100],
            ['member' => $members[3] ?? $ownerMember, 'text' => '了解です🙌', 'minutes' => 95],
        ];

        foreach ($chatMessages as $chat) {
            Post::create([
                'circle_id' => $circle->id,
                'author_member_id' => $chat['member']->id,
                'user_id' => $chat['member']->user_id,
                'post_type' => 'chat',
                'body' => $chat['text'],
                'tags' => [],
                'is_pinned' => false,
                'pin_kind' => null,
                'pin_due_at' => null,
                'like_count' => 0,
                'created_at' => $now->copy()->subMinutes($chat['minutes']),
                'updated_at' => $now->copy()->subMinutes($chat['minutes']),
            ]);
        }

        $guestProfiles = [];
        $guestNames = ['Aya', 'Nana'];
        foreach ($guestNames as $index => $guestName) {
            $guestUser = User::firstOrCreate(
                ['email' => strtolower($guestName) . '@guest.example.com'],
                ['name' => $guestName, 'password' => Hash::make('password')]
            );

            $guestProfiles[] = MeProfile::updateOrCreate(
                ['device_id' => sprintf('demo-guest-%03d', $index + 1)],
                [
                    'nickname' => $guestName,
                    'initial' => substr($guestName, 0, 1),
                    'user_id' => $guestUser->id,
                ]
            );
        }

        $joinRequests = [
            ['profile' => $guestProfiles[0] ?? null, 'message' => '同担歓迎です！参加希望です。'],
            ['profile' => $guestProfiles[1] ?? null, 'message' => '遠征仲間探してます🙌'],
        ];

        foreach ($joinRequests as $joinRequest) {
            if (!$joinRequest['profile']) {
                continue;
            }
            CircleJoinRequest::updateOrCreate(
                [
                    'circle_id' => $circle->id,
                    'me_profile_id' => $joinRequest['profile']->id,
                ],
                [
                    'status' => 'pending',
                    'message' => $joinRequest['message'],
                ]
            );
        }
    }
}
