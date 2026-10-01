<?php

namespace App\Http\Controllers\Api;

use App\Exports\ReportsExport;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportController extends Controller
{
    public function summary(ReportService $reports): JsonResponse
    {
        $clients = $reports->clientPerformance();

        return response()->json(['data' => [
            'stats' => [
                'revenueCollected' => round(Payment::sum('amount'), 2),
                'outstandingBalance' => round($clients->sum('balance'), 2),
                'overdueAccounts' => $clients->where('status', 'Overdue')->count(),
            ],
            'monthlyCollections' => $reports->monthlyCollections(6),
            'clients' => $clients,
        ]]);
    }

    /** GET /api/reports/export — Excel workbook (Clients sheet + Payments sheet). */
    public function export(): BinaryFileResponse
    {
        return Excel::download(new ReportsExport, 'invoicify-report-'.now()->format('Ymd').'.xlsx');
    }
}
