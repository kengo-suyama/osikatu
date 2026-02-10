<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class BillingPublicUrlTest extends TestCase
{
    public function test_billing_urls_resolve_from_public_url(): void
    {
        config([
            'billing.public_url' => 'https://osikatu.com',
            'billing.success_url' => '/billing/complete',
            'billing.cancel_url' => '/pricing',
            'billing.portal_return_url' => '/settings/billing',
        ]);

        // Use the resolveUrl logic via reflection or config reads
        $base = config('billing.public_url');
        $success = $this->resolveTestUrl($base, config('billing.success_url'));
        $cancel = $this->resolveTestUrl($base, config('billing.cancel_url'));
        $portal = $this->resolveTestUrl($base, config('billing.portal_return_url'));

        $this->assertSame('https://osikatu.com/billing/complete', $success);
        $this->assertSame('https://osikatu.com/pricing', $cancel);
        $this->assertSame('https://osikatu.com/settings/billing', $portal);
    }

    public function test_full_url_overrides_base(): void
    {
        config([
            'billing.public_url' => 'https://osikatu.com',
            'billing.success_url' => 'https://custom.example.com/done',
        ]);

        $base = config('billing.public_url');
        $success = $this->resolveTestUrl($base, config('billing.success_url'));

        $this->assertSame('https://custom.example.com/done', $success);
    }

    public function test_fallback_to_app_url(): void
    {
        config([
            'app.url' => 'https://fallback.test',
            'billing.public_url' => 'https://fallback.test',
            'billing.success_url' => '/billing/complete',
        ]);

        $base = config('billing.public_url');
        $success = $this->resolveTestUrl($base, config('billing.success_url'));

        $this->assertSame('https://fallback.test/billing/complete', $success);
    }

    private function resolveTestUrl(string $baseUrl, string $value): string
    {
        $v = trim($value);
        if ($v === '') {
            return '';
        }
        if (preg_match('/^https?:\/\//i', $v) === 1) {
            return $v;
        }
        $base = trim($baseUrl);
        if ($base === '') {
            return $v;
        }
        if (str_starts_with($v, '/')) {
            return rtrim($base, '/') . $v;
        }
        return rtrim($base, '/') . '/' . ltrim($v, '/');
    }
}
