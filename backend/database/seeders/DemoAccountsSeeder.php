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
    /**
     * Environments where seeding weak demo credentials is safe.
     * Anything else (production, staging, preview, …) throws.
     */
    private const ALLOWED_ENVS = ['local', 'testing'];

    public function run(): void
    {
        // Strict allow-list: refuse to run outside local/testing. Previous
        // guard only blocked `production`, which meant a `staging` or
        // `preview` environment could silently create these credentials
        // — they are in git history so anyone reading the repo can log in.
        $env = app()->environment();
        if (! in_array($env, self::ALLOWED_ENVS, true)) {
            throw new \RuntimeException(
                "DemoAccountsSeeder ne peut tourner qu'en local ou testing (env courant: {$env}). "
                .'Pour créer un admin en prod/staging, utilisez tinker avec un mot de passe fort — voir DEPLOYMENT.md §2.'
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
