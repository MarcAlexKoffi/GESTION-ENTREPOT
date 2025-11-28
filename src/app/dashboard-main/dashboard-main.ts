import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface CardInfo {
  id: number;
  imageUrl: string;
  name: string;
  location: string;
  pending: number;
  active: number;
  discharged: number;
}

// Ce modèle correspond aux camions enregistrés dans localStorage ("trucks")
interface StoredTruck {
  id: number;
  entrepotId: number;
  statut: string;
}

@Component({
  selector: 'app-dashboard-main',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-main.html',
  styleUrl: './dashboard-main.scss',
})
export class DashboardMain implements OnInit {
  // Cartes d'entrepôts
  cards: Array<CardInfo> = [
    {
      id: 1,
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
  ];

  // Modale création / édition
  showWarehouseModal = false;
  mode: 'create' | 'edit' = 'create';
  editingWarehouseId: number | null = null;

  // Menu d'actions ⋮
  actionsMenuWarehouseId: number | null = null;

  // Données du formulaire d'entrepôt
  newWarehouse: Partial<CardInfo> = {
    name: '',
    location: '',
    imageUrl: '',
    pending: 0,
    active: 0,
    discharged: 0,
  };

  constructor(private router: Router) {}

  // ---------------------------------------------------------------------------
  // INITIALISATION
  // ---------------------------------------------------------------------------
  ngOnInit(): void {
    const saved = localStorage.getItem('warehouses');
    if (saved) {
      try {
        this.cards = JSON.parse(saved) as CardInfo[];
      } catch (e) {
        console.error('Erreur de lecture du localStorage (warehouses)', e);
      }
    }

    // Recalcule les stats à partir des camions enregistrés
    this.updateWarehouseStatsFromTrucks();
  }

  // ---------------------------------------------------------------------------
  // NAVIGATION VERS LA PAGE DÉTAIL D'UN ENTREPÔT
  // ---------------------------------------------------------------------------
  handleContanerClick(card: CardInfo): void {
    console.log(card);
    this.router.navigate(['/dashboard/entrepot', card.id]);
  }

  // ---------------------------------------------------------------------------
  // MODALE : OUVERTURE / FERMETURE (MODE CRÉATION PAR DÉFAUT)
  // ---------------------------------------------------------------------------
  openWarehouseModal(): void {
    this.mode = 'create';
    this.editingWarehouseId = null;

    this.newWarehouse = {
      name: '',
      location: '',
      imageUrl: '',
      pending: 0,
      active: 0,
      discharged: 0,
    };

    this.showWarehouseModal = true;
  }

  closeWarehouseModal(): void {
    this.showWarehouseModal = false;
  }

  // ---------------------------------------------------------------------------
  // MENU D'ACTIONS ⋮ SUR LA CARTE
  // ---------------------------------------------------------------------------
  openActionsMenu(card: CardInfo, event: MouseEvent): void {
    event.stopPropagation();

    if (this.actionsMenuWarehouseId === card.id) {
      // Si on clique à nouveau sur le même bouton, on ferme
      this.actionsMenuWarehouseId = null;
    } else {
      this.actionsMenuWarehouseId = card.id;
    }
  }

  // ---------------------------------------------------------------------------
  // MODIFICATION D'UN ENTREPÔT
  // ---------------------------------------------------------------------------
  onEditWarehouse(card: CardInfo): void {
    this.actionsMenuWarehouseId = null;

    this.mode = 'edit';
    this.editingWarehouseId = card.id;

    // Pré-remplir le formulaire avec les données existantes
    this.newWarehouse = {
      name: card.name,
      location: card.location,
      imageUrl: card.imageUrl,
      pending: card.pending,
      active: card.active,
      discharged: card.discharged,
    };

    this.showWarehouseModal = true;
  }

  // ---------------------------------------------------------------------------
  // SUPPRESSION D'UN ENTREPÔT + CAMIONS ASSOCIÉS (Option B)
  // ---------------------------------------------------------------------------
  onDeleteWarehouse(card: CardInfo): void {
    this.actionsMenuWarehouseId = null;

    const confirmation = confirm(
      `Voulez-vous vraiment supprimer l'entrepôt "${card.name}" ? ` +
        `Tous les camions liés à cet entrepôt seront également supprimés.`
    );
    if (!confirmation) {
      return;
    }

    // 1) Supprimer l'entrepôt dans localStorage["warehouses"]
    const rawWarehouses = localStorage.getItem('warehouses');
    let warehouses: CardInfo[] = [];

    if (rawWarehouses) {
      try {
        warehouses = JSON.parse(rawWarehouses) as CardInfo[];
      } catch (e) {
        console.error('Erreur de lecture du localStorage (warehouses)', e);
      }
    }

    const updatedWarehouses = warehouses.filter((w) => w.id !== card.id);
    localStorage.setItem('warehouses', JSON.stringify(updatedWarehouses));

    // Mettre à jour les cartes affichées
    this.cards = this.cards.filter((w) => w.id !== card.id);

    // 2) Supprimer les camions liés dans localStorage["trucks"]
    const rawTrucks = localStorage.getItem('trucks');
    if (rawTrucks) {
      try {
        const allTrucks = JSON.parse(rawTrucks) as StoredTruck[];
        const filteredTrucks = allTrucks.filter(
          (t) => t.entrepotId !== card.id
        );
        localStorage.setItem('trucks', JSON.stringify(filteredTrucks));
      } catch (e) {
        console.error('Erreur de lecture du localStorage (trucks)', e);
      }
    }

    // 3) Recalcul des stats
    this.updateWarehouseStatsFromTrucks();
  }

  // ---------------------------------------------------------------------------
  // SAUVEGARDE (CRÉATION OU MODIFICATION)
  // ---------------------------------------------------------------------------
  saveWarehouse(): void {
    if (!this.newWarehouse.name || !this.newWarehouse.location) {
      alert(
        'Merci de saisir au moins le nom et la localisation de l’entrepôt.'
      );
      return;
    }

    // --- CAS 1 : CRÉATION ---
    if (this.mode === 'create') {
      const nextId =
        this.cards.length > 0
          ? this.cards[this.cards.length - 1].id + 1
          : 1;

      const warehouse: CardInfo = {
        id: nextId,
        imageUrl:
          (this.newWarehouse.imageUrl as string) ||
          'https://via.placeholder.com/800x400?text=Nouvel+entrepot',
        name: this.newWarehouse.name as string,
        location: this.newWarehouse.location as string,
        pending: Number(this.newWarehouse.pending ?? 0),
        active: Number(this.newWarehouse.active ?? 0),
        discharged: Number(this.newWarehouse.discharged ?? 0),
      };

      this.cards.push(warehouse);
    }

    // --- CAS 2 : MODIFICATION ---
    else if (this.mode === 'edit' && this.editingWarehouseId !== null) {
      const index = this.cards.findIndex(
        (c) => c.id === this.editingWarehouseId
      );
      if (index !== -1) {
        this.cards[index] = {
          ...this.cards[index],
          name: this.newWarehouse.name as string,
          location: this.newWarehouse.location as string,
          imageUrl:
            (this.newWarehouse.imageUrl as string) ||
            this.cards[index].imageUrl,
          pending: Number(
            this.newWarehouse.pending ?? this.cards[index].pending
          ),
          active: Number(
            this.newWarehouse.active ?? this.cards[index].active
          ),
          discharged: Number(
            this.newWarehouse.discharged ?? this.cards[index].discharged
          ),
        };
      }
    }

    // Sauvegarde dans le navigateur
    localStorage.setItem('warehouses', JSON.stringify(this.cards));

    // Reset du formulaire
    this.newWarehouse = {
      name: '',
      location: '',
      imageUrl: '',
      pending: 0,
      active: 0,
      discharged: 0,
    };

    // Fermer la modale et rafraîchir les stats
    this.closeWarehouseModal();
    this.updateWarehouseStatsFromTrucks();
  }

  // ---------------------------------------------------------------------------
  // RECALCUL DES STATS DES ENTREPÔTS À PARTIR DES CAMIONS ("trucks")
  // ---------------------------------------------------------------------------
  private updateWarehouseStatsFromTrucks(): void {
    const trucksSaved = localStorage.getItem('trucks');
    if (!trucksSaved) {
      return;
    }

    let allTrucks: StoredTruck[] = [];
    try {
      allTrucks = JSON.parse(trucksSaved) as StoredTruck[];
    } catch (e) {
      console.error('Erreur de lecture du localStorage (trucks)', e);
      return;
    }

    this.cards = this.cards.map((card) => {
      const trucksForWarehouse = allTrucks.filter(
        (t) => t.entrepotId === card.id
      );
      const pending = trucksForWarehouse.filter(
        (t) => t.statut === 'En attente'
      ).length;
      const active = trucksForWarehouse.filter(
        (t) => t.statut === 'En cours de déchargement'
      ).length;
      const discharged = trucksForWarehouse.filter(
        (t) => t.statut === 'Déchargé'
      ).length;

      return {
        ...card,
        pending,
        active,
        discharged,
      };
    });
  }
}
