<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@rene-football.test'],
            [
                'name' => 'Admin Rene',
                'password' => Hash::make('admin1234'),
                'is_admin' => true,
            ]
        );

        $this->call([
            PlayerSeeder::class,
            AppearanceSeeder::class,
        ]);
    }
}
