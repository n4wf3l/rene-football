<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Comptes de démonstration (mots de passe faibles). Extraits du
 * DatabaseSeeder principal pour qu'un `php artisan db:seed` malencontreux
 * en prod ne les crée pas.
 *
 * À invoquer explicitement en local :
 *     php artisan db:seed --class=DemoAccountsSeeder
 *
 * L'admin réel de production doit être créé via tinker avec un mot de
 * passe fort — voir DEPLOYMENT.md §2.
 */
class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // Refuse to run in production — these credentials are public
        // knowledge in the repo, they must never touch a prod database.
        if (app()->environment('production')) {
            throw new \RuntimeException(
                'DemoAccountsSeeder ne doit jamais tourner en production. '
                .'Utilisez tinker pour créer un admin avec un mot de passe fort.'
            );
        }

        // Owner / super-admin — mot de passe : admin1234
        User::updateOrCreate(
            ['email' => 'admin@rene-football.test'],
            [
                'name' => 'Admin Rene',
                'password' => Hash::make('admin1234'),
                'is_admin' => true,
                'is_head_of_scouting' => false,
                'scouting_scope' => null,
            ]
        );

        // Chef de recrutement — mot de passe : chef1234
        User::updateOrCreate(
            ['email' => 'chef@rene-football.test'],
            [
                'name' => 'Léa Chef-Recrutement',
                'password' => Hash::make('chef1234'),
                'is_admin' => true,
                'is_head_of_scouting' => true,
                'scouting_scope' => ['Pro'],
            ]
        );

        // Responsable jeunes — mot de passe : youth1234
        User::updateOrCreate(
            ['email' => 'jeunes@rene-football.test'],
            [
                'name' => 'Marc Resp-Jeunes',
                'password' => Hash::make('youth1234'),
                'is_admin' => true,
                'is_head_of_scouting' => true,
                'scouting_scope' => ['U19', 'U23'],
            ]
        );

        // Scout terrain — mot de passe : scout1234
        User::updateOrCreate(
            ['email' => 'scout@rene-football.test'],
            [
                'name' => 'Sam Scout',
                'password' => Hash::make('scout1234'),
                'is_admin' => true,
                'is_head_of_scouting' => false,
                'scouting_scope' => null,
            ]
        );
    }
}
