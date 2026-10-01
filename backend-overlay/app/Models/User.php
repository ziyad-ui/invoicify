<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_OWNER = 'owner';
    public const ROLE_STAFF = 'staff';
    public const ROLE_CLIENT = 'client';

    protected $fillable = ['name', 'email', 'password', 'role', 'client_id', 'is_active', 'must_change_password'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function title(): string
    {
        return match ($this->role) {
            self::ROLE_OWNER => 'Owner / General Manager',
            self::ROLE_STAFF => 'Administrative Staff',
            default => 'Client',
        };
    }
}
