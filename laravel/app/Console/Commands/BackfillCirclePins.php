<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\CirclePin;
use App\Models\Post;
use Illuminate\Support\Facades\DB;

class BackfillCirclePins
{
    /**
     * Backfill circle_pins from legacy Phase1 pins (posts.is_pinned=true).
     *
     * This is intended to be idempotent: it will upsert by source_post_id.
     *
     * @return array{scanned:int, upserted:int}
     */
    public function handle(bool $dryRun = false): array
    {
        $scanned = 0;
        $upserted = 0;

        Post::query()
            ->where('is_pinned', true)
            ->orderBy('id')
            ->chunkById(200, function ($posts) use (&$scanned, &$upserted, $dryRun): void {
                foreach ($posts as $post) {
                    $scanned += 1;

                    $body = (string) ($post->body ?? '');
                    $parsed = $this->extractTitleAndUrl($body);

                    if ($dryRun) {
                        $upserted += 1;
                        continue;
                    }

                    CirclePin::updateOrCreate(
                        ['source_post_id' => $post->id],
                        [
                            'circle_id' => (int) $post->circle_id,
                            'created_by_member_id' => $post->author_member_id ? (int) $post->author_member_id : null,
                            'title' => $parsed['title'],
                            'url' => $parsed['url'],
                            'body' => $body,
                            'pinned_at' => $post->created_at ?? now(),
                        ]
                    );

                    $upserted += 1;
                }
            });

        return [
            'scanned' => $scanned,
            'upserted' => $upserted,
        ];
    }

    /**
     * Backfill sort_order for circle_pins rows where it is null.
     * Assigns sequential values per circle, ordered by pinned_at ASC then id ASC.
     *
     * @return array{circles:int, filled:int}
     */
    public function backfillSortOrder(bool $dryRun = false): array
    {
        $circleIds = CirclePin::query()
            ->whereNull('sort_order')
            ->distinct()
            ->pluck('circle_id');

        $circles = 0;
        $filled = 0;

        foreach ($circleIds as $circleId) {
            $circles++;
            $maxSort = CirclePin::query()
                ->where('circle_id', $circleId)
                ->whereNotNull('sort_order')
                ->max('sort_order') ?? 0;

            $nullPins = CirclePin::query()
                ->where('circle_id', $circleId)
                ->whereNull('sort_order')
                ->orderBy('pinned_at')
                ->orderBy('id')
                ->get();

            foreach ($nullPins as $pin) {
                $maxSort++;
                $filled++;
                if (!$dryRun) {
                    $pin->update(['sort_order' => $maxSort]);
                }
            }
        }

        return [
            'circles' => $circles,
            'filled' => $filled,
        ];
    }

    /**
     * @return array{title: string, url: ?string}
     */
    private function extractTitleAndUrl(string $body): array
    {
        $lines = preg_split("/\\r\\n|\\n|\\r/", $body) ?: [];
        $title = trim((string) ($lines[0] ?? ''));
        if ($title === '') {
            $title = '(無題)';
        }

        $url = null;
        foreach ($lines as $line) {
            if (!is_string($line)) {
                continue;
            }
            if (preg_match('/^\\s*URL:\\s*(\\S+)/i', $line, $m) === 1) {
                $candidate = trim((string) ($m[1] ?? ''));
                if ($candidate !== '') {
                    $url = $this->substrSafe($candidate, 2048);
                }
                break;
            }
        }

        return [
            'title' => $this->substrSafe($title, 120),
            'url' => $url,
        ];
    }

    private function substrSafe(string $value, int $maxLen): string
    {
        if (function_exists('mb_substr')) {
            return (string) mb_substr($value, 0, $maxLen);
        }
        return substr($value, 0, $maxLen);
    }
}

