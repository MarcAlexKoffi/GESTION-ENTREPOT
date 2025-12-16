import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

type UserRole = 'admin' | 'operator' | 'driver' | 'security';
type UserStatus = 'Actif' | 'Inactif' | 'En attente';

interface StoredWarehouse {
  id: number;
  name: string;
  location: string;
  imageUrl?: string;
}

interface StoredUser {
  id: number;
  nom: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  entrepotId: number | null; // certains rôles peuvent ne pas être liés à un entrepôt
  status: UserStatus;
  createdAt: string;
}

@Component({
  selector: 'app-users-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-manager.html',
  styleUrl: './users-manager.scss',
})
export class UsersManager implements OnInit {
  // --- storage keys
  private readonly usersKey = 'users';
  private readonly warehousesKey = 'warehouses';

  // --- data
  users: StoredUser[] = [];
  warehouses: StoredWarehouse[] = [];

  // --- filters
  searchTerm = '';
  selectedRole: '' | UserRole = '';
  selectedWarehouseId: '' | number = '';

  // --- modal create/edit
  showUserModal = false;
  isEditMode = false;

  formUser: {
    id?: number;
    nom: string;
    email: string;
    username: string;
    password: string;
    role: UserRole;
    entrepotId: number | null;
    status: UserStatus;
  } = this.getEmptyFormUser();

  // --- UI message simple
  toastMessage: string | null = null;

  ngOnInit(): void {
    this.loadWarehouses();
    this.seedAdminIfEmpty();
    this.loadUsers();
  }

  // ---------------------------
  // Chargement / sauvegarde
  // ---------------------------
  private loadWarehouses(): void {
    const raw = localStorage.getItem(this.warehousesKey);
    if (!raw) {
      this.warehouses = [];
      return;
    }
    try {
      this.warehouses = JSON.parse(raw) as StoredWarehouse[];
    } catch {
      this.warehouses = [];
    }
  }

  private loadUsers(): void {
    const raw = localStorage.getItem(this.usersKey);
    if (!raw) {
      this.users = [];
      return;
    }
    try {
      this.users = JSON.parse(raw) as StoredUser[];
    } catch {
      this.users = [];
    }
    // tri: plus récent en premier
    this.users.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private saveUsers(): void {
    localStorage.setItem(this.usersKey, JSON.stringify(this.users));
  }

  // Crée un admin par défaut si aucun user n'existe (pratique pour démarrer)
  private seedAdminIfEmpty(): void {
    const raw = localStorage.getItem(this.usersKey);
    if (raw) return;

    const now = new Date().toISOString();
    const defaultAdmin: StoredUser = {
      id: Date.now(),
      nom: 'Administrateur',
      email: 'admin@local',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      entrepotId: null,
      status: 'Actif',
      createdAt: now,
    };

    localStorage.setItem(this.usersKey, JSON.stringify([defaultAdmin]));
  }

  // ---------------------------
  // Helpers affichage
  // ---------------------------
  get filteredUsers(): StoredUser[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.users.filter((u) => {
      if (search) {
        const haystack = `${u.nom} ${u.email} ${u.username}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (this.selectedRole) {
        if (u.role !== this.selectedRole) return false;
      }

      if (this.selectedWarehouseId !== '') {
        const wid = Number(this.selectedWarehouseId);
        if (u.entrepotId !== wid) return false;
      }

      return true;
    });
  }

  getWarehouseName(entrepotId: number | null): string {
    if (entrepotId === null) return '—';
    return this.warehouses.find((w) => w.id === entrepotId)?.name ?? '—';
  }

  getInitials(nom: string): string {
    const parts = nom.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? parts[1][0] : (parts[0]?.[1] ?? '');
    return (first + second).toUpperCase();
  }

  roleLabel(role: UserRole): string {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'operator':
        return 'Opérateur';
      case 'driver':
        return 'Chauffeur';
      case 'security':
        return 'Sécurité';
      default:
        return role;
    }
  }

  roleIcon(role: UserRole): string {
    switch (role) {
      case 'admin':
        return 'shield_person';
      case 'operator':
        return 'desktop_windows';
      case 'driver':
        return 'local_shipping';
      case 'security':
        return 'security';
      default:
        return 'person';
    }
  }

  statusClass(status: UserStatus): string {
    switch (status) {
      case 'Actif':
        return 'active';
      case 'Inactif':
        return 'inactive';
      case 'En attente':
        return 'pending';
      default:
        return 'active';
    }
  }

  // ---------------------------
  // Modal create/edit
  // ---------------------------
  openCreateUser(): void {
    this.isEditMode = false;
    this.formUser = this.getEmptyFormUser();
    // par défaut, on choisit le 1er entrepôt si disponible
    if (this.warehouses.length > 0) {
      this.formUser.entrepotId = this.warehouses[0].id;
    }
    this.showUserModal = true;
  }

  openEditUser(user: StoredUser): void {
    this.isEditMode = true;
    this.formUser = {
      id: user.id,
      nom: user.nom,
      email: user.email,
      username: user.username,
      password: user.password,
      role: user.role,
      entrepotId: user.entrepotId,
      status: user.status,
    };
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
  }

  saveUserFromModal(): void {
    // validations simples
    if (!this.formUser.nom.trim()) {
      this.showToast('Veuillez saisir le nom.');
      return;
    }
    if (!this.formUser.username.trim()) {
      this.showToast('Veuillez saisir un identifiant.');
      return;
    }
    if (!this.formUser.password.trim()) {
      this.showToast('Veuillez saisir un mot de passe.');
      return;
    }

    // username unique
    const usernameLower = this.formUser.username.trim().toLowerCase();
    const conflict = this.users.find(
      (u) =>
        u.username.toLowerCase() === usernameLower &&
        u.id !== this.formUser.id
    );
    if (conflict) {
      this.showToast('Identifiant déjà utilisé. Choisissez-en un autre.');
      return;
    }

    // email unique (si renseigné)
    const emailLower = this.formUser.email.trim().toLowerCase();
    if (emailLower) {
      const emailConflict = this.users.find(
        (u) => u.email.toLowerCase() === emailLower && u.id !== this.formUser.id
      );
      if (emailConflict) {
        this.showToast('Email déjà utilisé. Choisissez-en un autre.');
        return;
      }
    }

    // si role admin, entrepotId peut être null
    if (this.formUser.role !== 'admin') {
      // pour les autres rôles, on conseille un entrepôt si dispo
      if (this.warehouses.length > 0 && this.formUser.entrepotId === null) {
        this.formUser.entrepotId = this.warehouses[0].id;
      }
    }

    if (this.isEditMode && this.formUser.id) {
      const idx = this.users.findIndex((u) => u.id === this.formUser.id);
      if (idx >= 0) {
        this.users[idx] = {
          ...this.users[idx],
          nom: this.formUser.nom.trim(),
          email: this.formUser.email.trim(),
          username: this.formUser.username.trim(),
          password: this.formUser.password,
          role: this.formUser.role,
          entrepotId: this.formUser.entrepotId,
          status: this.formUser.status,
        };
        this.saveUsers();
        this.showToast('Utilisateur mis à jour.');
      }
    } else {
      const now = new Date().toISOString();
      const newUser: StoredUser = {
        id: Date.now(),
        nom: this.formUser.nom.trim(),
        email: this.formUser.email.trim(),
        username: this.formUser.username.trim(),
        password: this.formUser.password,
        role: this.formUser.role,
        entrepotId: this.formUser.entrepotId,
        status: this.formUser.status,
        createdAt: now,
      };
      this.users.unshift(newUser);
      this.saveUsers();
      this.showToast('Utilisateur créé.');
    }

    this.closeUserModal();
  }

  deleteUser(user: StoredUser): void {
    // empêcher de supprimer le dernier admin
    if (user.role === 'admin') {
      const admins = this.users.filter((u) => u.role === 'admin');
      if (admins.length <= 1) {
        this.showToast('Impossible : il doit rester au moins un administrateur.');
        return;
      }
    }

    const ok = confirm(`Supprimer l'utilisateur "${user.nom}" ?`);
    if (!ok) return;

    this.users = this.users.filter((u) => u.id !== user.id);
    this.saveUsers();
    this.showToast('Utilisateur supprimé.');
  }

  // modification rapide de l'entrepôt depuis le select dans le tableau
  updateUserWarehouse(user: StoredUser, entrepotIdValue: string): void {
    const entrepotId = entrepotIdValue ? Number(entrepotIdValue) : null;
    user.entrepotId = entrepotId;
    this.saveUsers();
    this.showToast('Entrepôt affecté.');
  }

  // ---------------------------
  // Private helpers
  // ---------------------------
  private getEmptyFormUser() {
    return {
      nom: '',
      email: '',
      username: '',
      password: '',
      role: 'operator' as UserRole,
      entrepotId: null as number | null,
      status: 'Actif' as UserStatus,
    };
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => {
      this.toastMessage = null;
    }, 2500);
  }
}
