<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class HealthReadyMailGuardTest extends TestCase
{
    private function setProductionBillingConfig(): void
    {
        app()->detectEnvironment(fn() => 'production');
        config([
            'app.env' => 'production',
            'billing.stripe_secret_key' => 'sk_live_test',
            'services.stripe.webhook_secret' => 'whsec_test',
            'billing.price_plus' => 'price_test',
            'billing.success_url' => '/billing/complete',
            'billing.cancel_url' => '/pricing',
        ]);
    }

    public function test_production_with_log_mailer_warns(): void
    {
        $this->setProductionBillingConfig();
        config([
            'mail.default' => 'log',
            'mail.from.address' => 'noreply@osikatu.com',
        ]);

        $response = $this->getJson('/api/health/ready');
        $data = $response->json('success.data');
        $warningCodes = array_column($data['warnings'] ?? [], 'code');
        $this->assertContains('MAIL_MAILER_NOT_PRODUCTION', $warningCodes);
    }

    public function test_production_with_missing_from_address_errors(): void
    {
        $this->setProductionBillingConfig();
        config([
            'mail.default' => 'smtp',
            'mail.from.address' => '',
            'mail.mailers.smtp.host' => 'smtp.sendgrid.net',
        ]);

        $response = $this->getJson('/api/health/ready');
        $data = $response->json('success.data');
        $errorCodes = array_column($data['errors'] ?? [], 'code');
        $this->assertContains('MAIL_FROM_ADDRESS_MISSING', $errorCodes);
    }

    public function test_production_smtp_without_host_errors(): void
    {
        $this->setProductionBillingConfig();
        config([
            'mail.default' => 'smtp',
            'mail.from.address' => 'noreply@osikatu.com',
            'mail.mailers.smtp.host' => '',
        ]);

        $response = $this->getJson('/api/health/ready');
        $data = $response->json('success.data');
        $errorCodes = array_column($data['errors'] ?? [], 'code');
        $this->assertContains('MAIL_HOST_MISSING', $errorCodes);
    }

    public function test_local_env_has_no_mail_errors(): void
    {
        config([
            'mail.default' => 'log',
            'mail.from.address' => '',
        ]);

        $response = $this->getJson('/api/health/ready');
        $data = $response->json('success.data');
        $errorCodes = array_column($data['errors'] ?? [], 'code');
        $this->assertNotContains('MAIL_FROM_ADDRESS_MISSING', $errorCodes);
    }
}
