<?php

use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\CircleController;
use App\Http\Controllers\Api\CircleChatController;
use App\Http\Controllers\Api\CircleAnnouncementController;
use App\Http\Controllers\Api\CircleJoinRequestController;
use App\Http\Controllers\Api\CircleOwnerController;
use App\Http\Controllers\Api\CircleScheduleController;
use App\Http\Controllers\Api\CircleUiSettingsController;
use App\Http\Controllers\Api\CircleMediaController;
use App\Http\Controllers\Api\DiaryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\FortuneController;
use App\Http\Controllers\Api\GoodController;
use App\Http\Controllers\Api\InviteController;
use App\Http\Controllers\Api\MePlanController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OshiController;
use App\Http\Controllers\Api\OperationLogController;
use App\Http\Controllers\Api\OshiActionController;
use App\Http\Controllers\Api\UserScheduleController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\CircleSettlementExpenseController;
use App\Http\Controllers\Api\SettlementController;
use Illuminate\Support\Facades\Route;

Route::get('/me', [MeController::class, 'show']);
Route::put('/me/ui-settings', [MeController::class, 'updateUiSettings']);
Route::put('/me/profile', [MeController::class, 'updateProfile']);
Route::post('/me/onboarding/skip', [MeController::class, 'skipOnboarding']);
Route::get('/me/plan', [MePlanController::class, 'show']);
Route::put('/me/plan', [MePlanController::class, 'update']);
Route::post('/me/cancel', [MePlanController::class, 'cancel']);
Route::get('/me/oshi-actions/today', [OshiActionController::class, 'today']);
Route::post('/me/oshi-actions/complete', [OshiActionController::class, 'complete']);
Route::get('/me/titles', [OshiActionController::class, 'titles']);
Route::get('/me/notifications', [NotificationController::class, 'index']);
Route::post('/me/notifications/{notification}/read', [NotificationController::class, 'read']);
Route::get('/me/logs', [OperationLogController::class, 'myIndex']);
Route::delete('/me/logs/{log}', [OperationLogController::class, 'destroy']);
Route::get('/me/fortune', [FortuneController::class, 'today']);
Route::get('/me/fortune/today', [FortuneController::class, 'today']);
Route::get('/me/fortune/history', [FortuneController::class, 'history']);
Route::get('/me/diaries', [DiaryController::class, 'index']);
Route::post('/me/diaries', [DiaryController::class, 'store']);
Route::get('/me/diaries/{diary}', [DiaryController::class, 'show']);
Route::put('/me/diaries/{diary}', [DiaryController::class, 'update']);
Route::delete('/me/diaries/{diary}', [DiaryController::class, 'destroy']);
Route::get('/me/expenses', [ExpenseController::class, 'index']);
Route::post('/me/expenses', [ExpenseController::class, 'store']);
Route::get('/me/expenses/{expense}', [ExpenseController::class, 'show']);
Route::put('/me/expenses/{expense}', [ExpenseController::class, 'update']);
Route::delete('/me/expenses/{expense}', [ExpenseController::class, 'destroy']);
Route::get('/me/expenses-summary', [ExpenseController::class, 'summary']);
Route::get('/me/goods', [GoodController::class, 'index']);
Route::post('/me/goods', [GoodController::class, 'store']);
Route::get('/me/goods/{good}', [GoodController::class, 'show']);
Route::put('/me/goods/{good}', [GoodController::class, 'update']);
Route::delete('/me/goods/{good}', [GoodController::class, 'destroy']);
Route::get('/me/budget', [BudgetController::class, 'show']);
Route::get('/me/schedules', [UserScheduleController::class, 'index']);
Route::post('/me/schedules', [UserScheduleController::class, 'store']);
Route::put('/me/schedules/{schedule}', [UserScheduleController::class, 'update']);
Route::delete('/me/schedules/{schedule}', [UserScheduleController::class, 'destroy']);
Route::put('/me/budget', [BudgetController::class, 'update']);
Route::post('/events', [EventController::class, 'store']);

Route::get('/oshis', [OshiController::class, 'index']);
Route::post('/oshis', [OshiController::class, 'store']);
Route::get('/oshis/{oshi}', [OshiController::class, 'show']);
Route::patch('/oshis/{oshi}', [OshiController::class, 'update']);
Route::post('/oshis/{oshi}/image', [OshiController::class, 'uploadImage']);
Route::post('/oshis/{oshi}/make-primary', [OshiController::class, 'makePrimary']);
Route::delete('/oshis/{oshi}', [OshiController::class, 'destroy']);

// Circles
Route::get('/circles', [CircleController::class, 'index']);
Route::get('/circles/search', [CircleController::class, 'search']);
Route::post('/circles', [CircleController::class, 'store']);
Route::get('/circles/{circle}', [CircleController::class, 'show']);
Route::delete('/circles/{circle}', [CircleController::class, 'destroy']);
Route::get('/circles/{circle}/invite', [InviteController::class, 'show']);
Route::get('/circles/{circle}/owner-dashboard', [CircleOwnerController::class, 'dashboard']);
Route::get('/circles/{circle}/logs', [OperationLogController::class, 'circleIndex']);
Route::delete('/circles/{circle}/logs/{log}', [OperationLogController::class, 'destroyCircle']);
Route::post('/circles/{circle}/remind', [CircleOwnerController::class, 'remind']);
Route::post('/circles/{circle}/owner-dashboard/remind', [CircleOwnerController::class, 'remind']);
Route::post('/circles/{circle}/join-requests', [CircleJoinRequestController::class, 'store']);
Route::get('/circles/{circle}/join-requests', [CircleJoinRequestController::class, 'index']);
Route::post('/circles/{circle}/join-requests/{joinRequest}/approve', [CircleJoinRequestController::class, 'approve']);
Route::post('/circles/{circle}/join-requests/{joinRequest}/reject', [CircleJoinRequestController::class, 'reject']);
Route::put('/circles/{circle}/ui-settings', [CircleUiSettingsController::class, 'update']);
Route::get('/circles/{circle}/chat/messages', [CircleChatController::class, 'index']);
Route::post('/circles/{circle}/chat/messages', [CircleChatController::class, 'store']);
Route::post('/circles/{circle}/chat/read', [CircleChatController::class, 'read']);
Route::delete('/circles/{circle}/chat/messages/{message}', [CircleChatController::class, 'destroy']);
Route::get('/circles/{circle}/announcement', [CircleAnnouncementController::class, 'show']);
Route::put('/circles/{circle}/announcement', [CircleAnnouncementController::class, 'update']);
Route::delete('/circles/{circle}/announcement', [CircleAnnouncementController::class, 'destroy']);

// Circle schedules (shared calendar)
Route::get('/circles/{circle}/calendar', [CircleScheduleController::class, 'index']);
Route::post('/circles/{circle}/calendar', [CircleScheduleController::class, 'store']);
Route::get('/circles/{circle}/calendar/{schedule}', [CircleScheduleController::class, 'show']);
Route::put('/circles/{circle}/calendar/{schedule}', [CircleScheduleController::class, 'update']);
Route::delete('/circles/{circle}/calendar/{schedule}', [CircleScheduleController::class, 'destroy']);

// Settlements
Route::get('/circles/{circle}/settlements', [SettlementController::class, 'index']);
Route::post('/circles/{circle}/settlements', [SettlementController::class, 'store']);
// Settlement expenses (台帳寄り割り勘 — read-only)
Route::get('/circles/{circle}/settlements/expenses', [CircleSettlementExpenseController::class, 'index']);
Route::get('/circles/{circle}/settlements/balances', [CircleSettlementExpenseController::class, 'balances']);
Route::get('/circles/{circle}/settlements/suggestions', [CircleSettlementExpenseController::class, 'suggestions']);
Route::post('/circles/{circle}/settlements/expenses', [CircleSettlementExpenseController::class, 'store']);
Route::post('/circles/{circle}/settlements/expenses/{expense}/void', [CircleSettlementExpenseController::class, 'voidExpense']);

Route::get('/circles/{circle}/settlements/{settlement}', [SettlementController::class, 'show']);
Route::patch('/circles/{circle}/settlements/{settlement}', [SettlementController::class, 'update']);

// Alias for spec compatibility
Route::get('/circles/{circle}/chat-messages', [CircleChatController::class, 'index']);
Route::post('/circles/{circle}/chat-messages', [CircleChatController::class, 'store']);
Route::delete('/circles/{circle}/chat-messages/{message}', [CircleChatController::class, 'destroy']);

// Legacy endpoints (keep for backward compatibility)
Route::post('/circles/{circle}/join-request', [CircleJoinRequestController::class, 'store']);
Route::post('/circles/{circle}/join-approve', [CircleJoinRequestController::class, 'approve']);
Route::post('/circles/{circle}/join-reject', [CircleJoinRequestController::class, 'reject']);

// Invites
Route::post('/circles/{circle}/invites', [InviteController::class, 'store']);
Route::get('/circles/{circle}/invites', [InviteController::class, 'index']);
Route::post('/circles/{circle}/invites/{invite}/revoke', [InviteController::class, 'revoke']);
Route::post('/invites/join', [InviteController::class, 'join']);
Route::post('/invites/accept', [InviteController::class, 'accept']);

// Circle album / media
Route::get('/circles/{circle}/media', [CircleMediaController::class, 'index']);
Route::post('/circles/{circle}/media', [CircleMediaController::class, 'store']);
Route::get('/circles/{circle}/media/{media}', [CircleMediaController::class, 'show']);
Route::delete('/circles/{circle}/media/{media}', [CircleMediaController::class, 'destroy']);

// Posts
Route::get('/circles/{circle}/posts', [PostController::class, 'index']);
Route::post('/circles/{circle}/posts', [PostController::class, 'store']);
Route::get('/circles/{circle}/pins', [PostController::class, 'indexPins']);
Route::post('/circles/{circle}/pins', [PostController::class, 'storePin']);
Route::patch('/circles/{circle}/pins/{post}', [PostController::class, 'updatePin']);
Route::post('/circles/{circle}/pins/{post}/unpin', [PostController::class, 'unpinPin']);
Route::post('/posts/{post}/media', [PostController::class, 'storeMedia']);
Route::post('/posts/{post}/like', [PostController::class, 'like']);
Route::delete('/posts/{post}/like', [PostController::class, 'unlike']);
Route::post('/posts/{post}/ack', [PostController::class, 'ack']);
