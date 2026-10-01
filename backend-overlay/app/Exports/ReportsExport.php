<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ReportsExport implements WithMultipleSheets
{
    public function sheets(): array
    {
        return [new ClientsSheet, new PaymentsSheet];
    }
}
