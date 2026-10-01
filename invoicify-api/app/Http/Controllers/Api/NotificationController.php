<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationLogResource;
use App\Models\NotificationLog;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    public function index()
    {
        $logs = NotificationLog::with('client')->latest()->limit(500)->get();

        return NotificationLogResource::collection($logs);
    }

    public function resend(NotificationLog $notificationLog, NotificationService $notifications): JsonResponse
    {
        $log = $notifications->resend($notificationLog)->load('client');

        return (new NotificationLogResource($log))->response()->setStatusCode(201);
    }
}
