import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {

  
  // ===============================================================
  // NOTIFICATIONS
  // ===============================================================
  notifCount = 0;
  showNotifDropdown = false;

  notifications: Array<{
    id: number;
    immatriculation: string;
    entrepotId: number;
    entrepotName: string;
    statut: string;
    advancedStatus?: string;
    heureArrivee: string;
  }> = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  // ===============================================================
  // CHARGEMENT DES NOTIFICATIONS
  // ===============================================================
  loadNotifications() {
    const rawTrucks = localStorage.getItem('trucks');
    const rawWarehouses = localStorage.getItem('warehouses');

    let trucks = rawTrucks ? JSON.parse(rawTrucks) : [];
    let warehouses = rawWarehouses ? JSON.parse(rawWarehouses) : [];

    // On charge :
    // Tous les camions "En attente" (analyses envoyées)
    // Tous les camions renvoyés vers l'admin (unreadForAdmin = true)
    this.notifications = trucks
      .filter((t: any) =>
        t.statut === 'En attente' ||
        t.unreadForAdmin === true
      )
      .map((t: any) => {
        const wh = warehouses.find((w: any) => w.id === t.entrepotId);
        return {
          id: t.id,
          immatriculation: t.immatriculation,
          entrepotId: t.entrepotId,
          entrepotName: wh ? wh.name : 'Entrepôt inconnu',
          statut: t.statut,
          advancedStatus: t.advancedStatus,
          heureArrivee: t.heureArrivee,
        };
      });

    // Nombre affiché sur le badge
    this.notifCount = this.notifications.length;
  }

  // ===============================================================
  // OUVERTURE / FERMETURE DU DROPDOWN
  // ===============================================================
 toggleNotifications(event: MouseEvent) {
  event.stopPropagation(); // empêche la fermeture immédiate
  this.showNotifDropdown = !this.showNotifDropdown;
}
@HostListener('document:click')
closeNotifOnOutsideClick(): void {
  this.showNotifDropdown = false;
}
@HostListener('document:keydown.escape')
closeNotifOnEscape(): void {
  this.showNotifDropdown = false;
}


  // ===============================================================
  // QUAND L'ADMIN CLIQUE SUR UNE NOTIFICATION
  // ===============================================================
  openNotification(n: any) {
    // On ferme le dropdown
    this.showNotifDropdown = false;

    // On lit les camions stockés
    const raw = localStorage.getItem('trucks');
    let all = raw ? JSON.parse(raw) : [];

    // On marque cette notification comme lue
    const idx = all.findIndex((t: any) => t.id === n.id);
    if (idx !== -1) {
      all[idx].unreadForAdmin = false;
      localStorage.setItem('trucks', JSON.stringify(all));
    }

    // Recharger les notifications (mise à jour du badge)
    this.loadNotifications();

    // Navigation vers l'entrepôt concerné
    this.router.navigate(['/dashboard/entrepot', n.entrepotId]);
  }
}
