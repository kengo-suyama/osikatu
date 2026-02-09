<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BillingPaymentFailedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $userName,
        public readonly string $portalUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Osikatu] お支払いに問題があります',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.billing.payment-failed',
        );
    }
}
