import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { DashboardMain } from './dashboard-main/dashboard-main';
import { Historique } from './historique/historique';
import { Entrepot } from './entrepot/entrepot';
import { Register } from './register/register';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: Login
    },
    {
        path: 'dashboard',
        component: Dashboard,
        children: [
            {
                path: '',
                redirectTo: 'dashboard-main',
                pathMatch: 'full'
            },
            {
                path: 'dashboard-main',
                component: DashboardMain
            },
            {
                path: 'historique',
                component: Historique
            },
            {
                path: 'entrepot',
                component: Entrepot
            }
        ]
    },
    {
        path: 'register',
        component: Register
    }
    
];
