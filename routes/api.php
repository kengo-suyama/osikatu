<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\DiaryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\GoodController;
use App\Http\Controllers\Api\MediaLinkController;
use App\Http\Controllers\Api\OshiController;
use App\Http\Controllers\Api\ScheduleController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('oshis', OshiController::class);
    Route::apiResource('schedules', ScheduleController::class);
    Route::apiResource('expenses', ExpenseController::class);
    Route::get('expenses/summary', [ExpenseController::class, 'summary']);
    Route::apiResource('goods', GoodController::class);
    Route::apiResource('diaries', DiaryController::class);

    Route::post('attachments', [AttachmentController::class, 'store']);
    Route::delete('attachments/{id}', [AttachmentController::class, 'destroy']);

    Route::post('media-links', [MediaLinkController::class, 'store']);
});
