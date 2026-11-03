<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\WhatsAppController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\InsightController;
use App\Http\Controllers\Api\DebtController;
use App\Http\Controllers\Api\NetWorthController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\RecurringTransactionController;
use App\Http\Controllers\Api\SavingsGoalController;
use App\Http\Controllers\Api\CustodialSavingController;
use App\Http\Controllers\Api\PaydayController;
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
    Route::post('/chat/parse-multiple', [ChatController::class, 'parseMultiple']);

    // Wallet routes — transfer must be defined BEFORE the resource to avoid
    // the {wallet} route parameter capturing the literal "transfer" segment.
    Route::post('/wallets/transfer', [WalletController::class, 'transfer']);
    Route::apiResource('wallets', WalletController::class);
    Route::post('/wallets/{wallet}/set-default', [WalletController::class, 'setDefault']);

    // Budget routes
    Route::get('/budgets/alerts', [BudgetController::class, 'alerts']);
    Route::post('/budgets/copy-previous', [BudgetController::class, 'copyFromPreviousMonth']);
    Route::get('/budgets', [BudgetController::class, 'index']);
    Route::post('/budgets', [BudgetController::class, 'store']);
    Route::delete('/budgets/{id}', [BudgetController::class, 'destroy']);

    // Financial Insights
    Route::get('/insights', [InsightController::class, 'index']);

    // Debt & Receivable routes
    Route::apiResource('debts', DebtController::class);
    Route::post('/debts/{debt}/payments', [DebtController::class, 'addPayment']);
    Route::delete('/debts/{debt}/payments/{payment}', [DebtController::class, 'deletePayment']);

    // Net Worth Tracker
    Route::get('/net-worth', [NetWorthController::class, 'index']);

    // Financial Calendar & Heatmap
    Route::get('/calendar', [CalendarController::class, 'index']);

    // Recurring Transactions
    Route::apiResource('recurring', RecurringTransactionController::class);
    Route::post('/recurring/{recurring}/toggle', [RecurringTransactionController::class, 'toggle']);
    Route::post('/recurring/{recurring}/log', [RecurringTransactionController::class, 'logTransaction']);

    // Savings Goals (Target Tabungan)
    Route::apiResource('savings-goals', SavingsGoalController::class);
    Route::post('/savings-goals/{savingsGoal}/deposit', [SavingsGoalController::class, 'deposit']);
    Route::delete('/savings-goals/{savingsGoal}/deposits/{deposit}', [SavingsGoalController::class, 'deleteDeposit']);

    // Simpanan & Deposito (Custodial Savings)
    Route::apiResource('custodial-savings', CustodialSavingController::class);
    Route::post('/custodial-savings/{custodialSaving}/deposit', [CustodialSavingController::class, 'deposit']);
    Route::post('/custodial-savings/{custodialSaving}/withdraw', [CustodialSavingController::class, 'withdraw']);

    // Safe-to-Spend & Payday Planner
    Route::get('/safe-to-spend', [PaydayController::class, 'safeToSpend']);
    Route::get('/payday-planner', [PaydayController::class, 'paydayPlanner']);
    Route::post('/payday-planner/apply', [PaydayController::class, 'applyPaydayAllocation']);

    Route::get(
        '/whatsapp/webhook',
        [WhatsAppController::class, 'verifyWebhook']
    );

    Route::post(
        '/whatsapp/webhook',
        [WhatsAppController::class, 'webhook']
    );
});
