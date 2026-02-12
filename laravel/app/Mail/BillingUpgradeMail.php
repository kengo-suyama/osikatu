<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BillingUpgradeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $userName,
        public readonly string $plan,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Osikatu] Plus' . "\xE3\x83\x97\xE3\x83\xA9\xE3\x83\xB3" . 'へようこそ',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.billing.upgrade',
        );
    }
}
