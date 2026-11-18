<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Key / JSON-value settings the owner can change from the Settings page. */
class AppSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    public static function read(string $key, mixed $default = null): mixed
    {
        $row = static::find($key);

        if (! $row || $row->value === null) {
            return $default;
        }

        $decoded = json_decode($row->value, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $default;
    }

    public static function write(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => json_encode($value)]);
    }

    public static function forget(string $key): void
    {
        static::where('key', $key)->delete();
    }
}
