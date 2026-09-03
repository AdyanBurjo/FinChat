<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\User::updateOrCreate(
            ['email' => 'lukmantoadyan@gmail.com'],
            [
                'name' => 'Adyan',
                'password' => \Illuminate\Support\Facades\Hash::make('Demon7172'),
            ]
        );
    }
}
