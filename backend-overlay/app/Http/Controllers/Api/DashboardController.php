<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use App\Models\Payment;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, ReportService $reports): JsonResponse
    {
        $isOwner = $request->user()->role === 'owner';

        $clients = Client::with(['property', 'plan', 'invoices'])->orderBy('name')->get();

        $overdue = $clients->where('status', 'Overdue')->count();
        $dueSoon = $clients->where('status', 'Due Soon')->count();

        $stats = [
            'activeClients' => $clients->where('status', '!=', 'Fully Paid')->count(),
            'pendingPayments' => $overdue + $dueSoon,
            'overdueAccounts' => $overdue,
            'dueSoon' => $dueSoon,
        ];

        $data = ['stats' => $stats];

        if ($isOwner) {
            // Financial totals are owner-only; staff never receive them from the API.
            $stats['revenueCollected'] = round(Payment::sum('amount'), 2);
            $stats['outstandingBalance'] = round($clients->sum('balance'), 2);
            $data['stats'] = $stats;
            $data['monthlyCollections'] = $reports->monthlyCollections(6);
            $data['clients'] = ClientResource::collection($clients)->resolve($request);
        } else {
            // Staff get the follow-up list only.
            $needsFollowUp = $clients->whereIn('status', ['Overdue', 'Due Soon'])->values();
            $data['clients'] = ClientResource::collection($needsFollowUp)->resolve($request);
        }

        return response()->json(['data' => $data]);
    }
}
