<?php

use App\Http\Controllers\Api\CircleController;
use App\Http\Controllers\Api\CircleJoinRequestController;
use App\Http\Controllers\Api\CircleOwnerController;
use App\Http\Controllers\Api\InviteController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\OshiController;
use App\Http\Controllers\Api\PostController;
use Illuminate\Support\Facades\Route;

Route::get('/me', [MeController::class, 'show']);

Route::get('/oshis', [OshiController::class, 'index']);
Route::post('/oshis', [OshiController::class, 'store']);
Route::get('/oshis/{oshi}', [OshiController::class, 'show']);
Route::patch('/oshis/{oshi}', [OshiController::class, 'update']);
Route::post('/oshis/{oshi}/image', [OshiController::class, 'uploadImage']);

// Circles
Route::get('/circles', [CircleController::class, 'index']);
Route::get('/circles/search', [CircleController::class, 'search']);
Route::post('/circles', [CircleController::class, 'store']);
Route::get('/circles/{circle}', [CircleController::class, 'show']);
Route::delete('/circles/{circle}', [CircleController::class, 'destroy']);
Route::get('/circles/{circle}/invite', [InviteController::class, 'show']);
Route::get('/circles/{circle}/owner-dashboard', [CircleOwnerController::class, 'dashboard']);
Route::post('/circles/{circle}/remind', [CircleOwnerController::class, 'remind']);
Route::post('/circles/{circle}/owner-dashboard/remind', [CircleOwnerController::class, 'remind']);
Route::post('/circles/{circle}/join-requests', [CircleJoinRequestController::class, 'store']);
Route::get('/circles/{circle}/join-requests', [CircleJoinRequestController::class, 'index']);
Route::post('/circles/{circle}/join-requests/{joinRequest}/approve', [CircleJoinRequestController::class, 'approve']);
Route::post('/circles/{circle}/join-requests/{joinRequest}/reject', [CircleJoinRequestController::class, 'reject']);

// Legacy endpoints (keep for backward compatibility)
Route::post('/circles/{circle}/join-request', [CircleJoinRequestController::class, 'store']);
Route::post('/circles/{circle}/join-approve', [CircleJoinRequestController::class, 'approve']);
Route::post('/circles/{circle}/join-reject', [CircleJoinRequestController::class, 'reject']);

// Invites
Route::post('/circles/{circle}/invites', [InviteController::class, 'store']);
Route::post('/invites/join', [InviteController::class, 'join']);

// Posts
Route::get('/circles/{circle}/posts', [PostController::class, 'index']);
Route::post('/circles/{circle}/posts', [PostController::class, 'store']);
Route::post('/posts/{post}/media', [PostController::class, 'storeMedia']);
Route::post('/posts/{post}/like', [PostController::class, 'like']);
Route::delete('/posts/{post}/like', [PostController::class, 'unlike']);
Route::post('/posts/{post}/ack', [PostController::class, 'ack']);
