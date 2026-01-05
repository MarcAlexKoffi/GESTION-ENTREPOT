import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface StoredTruck {
  id: number;
  entrepotId: number;
  immatriculation: string;
  transporteur: string;
  transfert: string;
  kor: string;
  statut: string; // 'En attente' | 'En cours de déchargement' | 'Déchargé' | 'Annulé'
  heureArrivee: string;
  createdAt: string; // date ISO
  debutDechargement?: string;
  finDechargement?: string;
}

interface StoredWarehouse {
  id: number;
  name: string;
  location: string;
}

interface TruckHistoryRow {
  entrepotId: number;
  entrepotName: string;
  immatriculation: string;
  transporteur: string;
  kor: string;
  heureArrivee: string;
  debutDechargement: string;
  finDechargement: string;
  statut: string;
  createdAt: string; // utile pour le filtre par période
}

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-historique.html',
  styleUrl: './user-historique.scss',
})
export class UserHistorique implements OnInit {
  // toutes les lignes (avant filtre)
  allRows: TruckHistoryRow[] = [];

  // lignes après filtre (celles affichées dans le tableau)
  filteredRows: TruckHistoryRow[] = [];

  // champs de filtre
  searchTerm: string = '';
  selectedStatus: string = 'Tous';
  selectedPeriod: string = 'Toutes';

  // options pour la liste des entrepôts
  warehousesOptions: StoredWarehouse[] = [];

  ngOnInit(): void {
    this.loadDataFromLocalStorage();
    this.filteredRows = [...this.allRows];
  }

  applyFilters(): void {
    this.filteredRows = this.allRows.filter((row) => {
      /* 🔍 Recherche */
      const search = this.searchTerm.toLowerCase();

      const matchesSearch =
        row.immatriculation?.toLowerCase().includes(search) ||
        row.transporteur?.toLowerCase().includes(search);

      /* Statut */
      const matchesStatus = this.selectedStatus === 'Tous' || row.statut === this.selectedStatus;

      /* Période */
      let matchesPeriod = true;

      if (this.selectedPeriod !== 'Toutes') {
        const rowDate = new Date(row.createdAt);
        const today = new Date();

        if (this.selectedPeriod === 'Aujourd’hui') {
          matchesPeriod = rowDate.toDateString() === today.toDateString();
        }

        if (this.selectedPeriod === '7 derniers jours') {
          const d = new Date();
          d.setDate(today.getDate() - 7);
          matchesPeriod = rowDate >= d;
        }

        if (this.selectedPeriod === '30 derniers jours') {
          const d = new Date();
          d.setDate(today.getDate() - 30);
          matchesPeriod = rowDate >= d;
        }
      }
      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }

  // Charge les entrepôts + camions depuis le localStorage
  private loadDataFromLocalStorage(): void {
    // 1) Entrepôts
    const rawWarehouses = localStorage.getItem('warehouses');
    if (rawWarehouses) {
      try {
        this.warehousesOptions = JSON.parse(rawWarehouses) as StoredWarehouse[];
      } catch (e) {
        console.error('Erreur parsing warehouses', e);
        this.warehousesOptions = [];
      }
    }

    // 2) Camions
    const rawTrucks = localStorage.getItem('trucks');
    if (!rawTrucks) {
      this.allRows = [];
      return;
    }

    let trucks: StoredTruck[] = [];
    try {
      trucks = JSON.parse(rawTrucks) as StoredTruck[];
      // Filtrage user : uniquement l'entrepôt assigné
      const rawUser = localStorage.getItem('currentUser');
      let currentUser: any = null;
      try {
        currentUser = rawUser ? JSON.parse(rawUser) : null;
      } catch {
        currentUser = null;
      }

      if (currentUser?.entrepotId !== null && currentUser?.entrepotId !== undefined) {
        trucks = trucks.filter((t) => t.entrepotId === currentUser.entrepotId);
      }
    } catch (e) {
      console.error('Erreur parsing trucks', e);
      trucks = [];
    }

    // 3) Construction des lignes d’historique
    this.allRows = trucks.map((t) => {
      const warehouse = this.warehousesOptions.find((w) => w.id === t.entrepotId) ?? null;

      return {
        entrepotId: t.entrepotId,
        entrepotName: warehouse ? warehouse.name : 'Entrepôt inconnu',
        immatriculation: t.immatriculation,
        transporteur: t.transporteur,
        kor: t.kor,
        heureArrivee: t.heureArrivee,
        debutDechargement: t.debutDechargement ?? '-',
        finDechargement: t.finDechargement ?? '-',
        statut: t.statut,
        createdAt: t.createdAt,
      };
    });

    // Tri : le plus récent en premier
    this.allRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Helpers pour les labels dans le template
  getStatusCssClass(statut: string): string {
    switch (statut) {
      case 'Déchargé':
        return 'status-pill status-pill--success';
      case 'En attente':
        return 'status-pill status-pill--warning';
      case 'Annulé':
        return 'status-pill status-pill--danger';
      case 'En cours de déchargement':
        return 'status-pill status-pill--info';
      default:
        return 'status-pill';
    }
  }

  exportCsv(): void {
    if (!this.filteredRows || this.filteredRows.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }

    // En-têtes CSV (dans l’ordre du tableau)
    const headers = [
      'Entrepôt',
      'Immatriculation',
      'Transporteur',
      'KOR',
      'Heure arrivée',
      'Début déchargement',
      'Fin déchargement',
      'Statut',
    ];

    // Lignes CSV
    const rows = this.filteredRows.map((row) => [
      row.entrepotName,
      row.immatriculation,
      row.transporteur,
      row.kor || '',
      row.heureArrivee,
      row.debutDechargement,
      row.finDechargement,
      row.statut,
    ]);

    // Construction du contenu CSV
    const csvContent = [headers, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    // Création du fichier
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `historique_passages_${new Date().toISOString().slice(0, 10)}.csv`;

    link.click();

    window.URL.revokeObjectURL(url);
  }
}
