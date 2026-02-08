<?php

declare(strict_types=1);

namespace App\Console\Commands;

class PinsV1Status
{
    /**
     * @return array{mode:string, configCached:bool}
     */
    public function handle(): array
    {
        $mode = (string) config('pins.v1_write_mode', 'delegate');
        if (!in_array($mode, ['delegate', 'deny'], true)) {
            $mode = 'delegate';
        }

        return [
            'mode' => $mode,
            'configCached' => $this->isConfigCached(),
        ];
    }

    private function isConfigCached(): bool
    {
        // Avoid relying on framework internals; file existence is enough for ops.
        $path = base_path('bootstrap/cache/config.php');
        return is_string($path) && $path !== '' && file_exists($path);
    }
}

