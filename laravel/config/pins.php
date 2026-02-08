<?php

declare(strict_types=1);

return [
    // delegate: keep backward compatibility (pins-v1 write delegates to PinWriteService)
    // deny: block pins-v1 write with 410 Gone (pins-v2 is unaffected)
    'v1_write_mode' => env('PINS_V1_WRITE_MODE', 'delegate'),
];

