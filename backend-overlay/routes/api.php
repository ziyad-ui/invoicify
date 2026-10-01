<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PortalController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/password', [ProfileController::class, 'updatePassword'])->middleware('throttle:6,1');

    // Owner + Administrative Staff
    Route::middleware('role:owner,staff')->group(function () {
        Route::get('/dashboard', DashboardController::class);

        Route::apiResource('clients', ClientController::class);
        Route::post('/clients/{client}/payments', [PaymentController::class, 'store']);

        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/payments', [PaymentController::class, 'index']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{notificationLog}/resend', [NotificationController::class, 'resend']);
    });

    // Owner only
    Route::middleware('role:owner')->prefix('reports')->group(function () {
        Route::get('/summary', [ReportController::class, 'summary']);
        Route::get('/export', [ReportController::class, 'export']);
    });

    // Client portal: a client only ever sees their own record
    Route::middleware('role:client')->prefix('portal')->group(function () {
        Route::get('/me', [PortalController::class, 'me']);
    });
});
