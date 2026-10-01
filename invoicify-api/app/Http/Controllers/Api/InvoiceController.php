<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    /** GET /api/invoices?status=Overdue|Due Soon|Upcoming|Paid */
    public function index(Request $request)
    {
        $invoices = Invoice::with('client')
            ->whereHas('client') // hides invoices of archived clients
            ->when($request->query('status'), function ($query, $status) {
                match ($status) {
                    'Overdue' => $query->overdue(),
                    'Due Soon' => $query->dueSoon(),
                    'Upcoming' => $query->upcoming(),
                    'Paid' => $query->paid(),
                    default => null,
                };
            })
            // Unpaid first, soonest due first; paid history after.
            ->orderByRaw('(paid_amount >= amount) asc')
            ->orderBy('due_date')
            ->limit(1000)
            ->get();

        return InvoiceResource::collection($invoices);
    }
}
