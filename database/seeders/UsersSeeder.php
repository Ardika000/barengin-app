<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'full_name' => 'Admin Barengin',
            'username'  => 'admin_bareng',
            'email'     => 'admin@barengin.com',
            'password'  => Hash::make('password123'),
            'phone'     => '081234567890',
            'gender'    => 'male',
            'is_admin'  => true,
            'is_guider' => true,        ]);

        User::create([
            'full_name' => 'Budi Penumpang',
            'username'  => 'budibareng',
            'email'     => 'budi@barengin.com',
            'password'  => Hash::make('password123'),
            'phone'     => '089234217890',
            'gender'    => 'male',
            'is_admin'  => false,
            'is_guider' => true,        
        ]);

        User::create([
            'full_name' => 'Lili Jastiper',
            'username'  => 'lilijastip',
            'email'     => 'lili@gmail.com',
            'password'  => Hash::make('password123'),
            'phone'     => '085555555555',
            'gender'    => 'female',
            'is_admin'  => false,
            'is_guider' => false,        ]);

        User::create([
            'full_name' => 'Andi Guider',
            'username'  => 'andiguider',
            'email'     => 'andi@gmail.com',
            'password'  => Hash::make('password123'),
            'phone'     => '085786542111',
            'gender'    => 'male',
            'is_admin'  => false,
            'is_guider' => true,        ]);
    }
}
