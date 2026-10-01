<?php

namespace App\Exports;

use App\Services\ReportService;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class ClientsSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize
{
    public function collection(): Collection
    {
        return (new ReportService)->clientPerformance()->map(fn ($c) => [
            $c['name'],
            $c['property'],
            $c['collected'],
            $c['balance'],
            $c['dueDate'],
            $c['status'],
        ]);
    }

    public function headings(): array
    {
        return ['Client', 'Property', 'Total Collected (PHP)', 'Outstanding Balance (PHP)', 'Next Due Date', 'Status'];
    }

    public function title(): string
    {
        return 'Clients';
    }
}
