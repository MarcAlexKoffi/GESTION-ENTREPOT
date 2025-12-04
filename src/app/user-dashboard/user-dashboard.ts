import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-dashboard',
  imports: [RouterModule, CommonModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss',
})
export class UserDashboard {
notifCount = 0;
showNotifDropdown = false;

notifications: Array<{
  id: number;
  immatriculation: string;
  entrepotId: number;
  entrepotName: string;
  statut: string;
}> = [];

ngOnInit(): void {
  this.loadNotifications();
}

loadNotifications() {
  const rawTrucks = localStorage.getItem('trucks');
  const rawWarehouses = localStorage.getItem('warehouses');

  let trucks = rawTrucks ? JSON.parse(rawTrucks) : [];
  let warehouses = rawWarehouses ? JSON.parse(rawWarehouses) : [];

  this.notifications = trucks
    .filter((t: any) => t.unreadForGerant === true)
    .map((t: any) => {
      const wh = warehouses.find((w: any) => w.id === t.entrepotId);
      return {
        id: t.id,
        immatriculation: t.immatriculation,
        entrepotId: t.entrepotId,
        entrepotName: wh ? wh.name : 'Inconnu',
        statut: t.statut
      };
    });

  this.notifCount = this.notifications.length;
}

toggleNotifications() {
  this.showNotifDropdown = !this.showNotifDropdown;
}

openNotification(n: any) {
  // Marquer comme lu
  const raw = localStorage.getItem('trucks');
  let all = raw ? JSON.parse(raw) : [];

  const idx = all.findIndex((t: any) => t.id === n.id);
  if (idx !== -1) {
    all[idx].unreadForGerant = false;
    localStorage.setItem('trucks', JSON.stringify(all));
  }

  this.showNotifDropdown = false;

  // Navigation vers l’entrepôt
  window.location.href = `/userdashboard/userentrepot/${n.entrepotId}`;
}

}
