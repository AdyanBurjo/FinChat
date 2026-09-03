<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\WhatsAppController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('transactions', TransactionController::class);

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    Route::post('/chat/parse', [ChatController::class, 'parse']);
    Route::post('/chat/confirm', [ChatController::class, 'confirm']);
    Route::post('/whatsapp/webhook', [WhatsAppController::class, 'webhook']);
    Route::post('/chat/parse-multiple', [ChatController::class, 'parseMultiple']);

    Route::get(
        '/whatsapp/webhook',
        [WhatsAppController::class, 'verifyWebhook']
    );

    Route::post(
        '/whatsapp/webhook',
        [WhatsAppController::class, 'webhook']
    );
});