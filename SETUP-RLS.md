# Configuration du Contrôle d'Accès Basé sur les Rôles (RBAC)

Ce guide explique comment configurer le système de permissions pour que les administrateurs puissent voir toutes les données.

## 📋 Prérequis

- Accès à votre projet Supabase
- Un utilisateur créé dans Supabase Auth

## 🚀 Installation

### Étape 1: Créer la synchronisation des utilisateurs

1. Allez dans l'**éditeur SQL** de Supabase
2. Exécutez le contenu du fichier `supabase-user-sync.sql`
3. Cela créera automatiquement un profil dans `public.users` quand un utilisateur s'inscrit

### Étape 2: Activer les politiques RLS

1. Dans l'**éditeur SQL** de Supabase
2. Exécutez le contenu du fichier `supabase-rls-policies.sql`
3. Cela activera Row Level Security sur toutes les tables

### Étape 3: Créer un utilisateur administrateur

#### Option A: Via l'interface Supabase

1. Allez dans **Authentication** → **Users**
2. Créez un nouvel utilisateur ou sélectionnez un existant
3. Allez dans l'**éditeur SQL**
4. Exécutez cette requête (remplacez l'email par celui de votre admin):

```sql
UPDATE public.users
SET
  role = 'admin',
  approved = true,
  full_name = 'Administrateur Principal',
  fonction = 'Administrateur Système',
  username = 'admin'
WHERE email = 'VOTRE_EMAIL@exemple.com';
```

#### Option B: Via une requête SQL complète

```sql
-- 1. Créer l'utilisateur dans auth.users (si pas déjà fait)
-- Ceci doit être fait via l'interface Supabase Auth

-- 2. Mettre à jour le profil pour le rendre admin
UPDATE public.users
SET
  role = 'admin',
  approved = true,
  disabled = false,
  full_name = 'Admin',
  username = 'admin',
  fonction = 'Administrateur',
  departement = 'IT'
WHERE email = 'admin@assurdash.com';
```

### Étape 4: Vérifier la configuration

1. Connectez-vous avec votre compte admin
2. Vous devriez voir un badge "Admin" dans le menu utilisateur
3. Toutes les données devraient être visibles

## 🔐 Fonctionnement des Permissions

### Utilisateurs Administrateurs (`role = 'admin'`)
- ✅ Peuvent voir **toutes les données** de toutes les tables
- ✅ Peuvent créer, modifier et supprimer des enregistrements
- ✅ Ont accès complet au système

### Utilisateurs Normaux
- ✅ Peuvent voir toutes les données (lecture seule)
- ❌ Ne peuvent pas créer, modifier ou supprimer des données
- ❌ Accès limité selon les besoins métier

## 📊 Structure de la Table Users

```sql
public.users (
  id uuid PRIMARY KEY,              -- Lié à auth.users(id)
  email text NOT NULL,
  username text NOT NULL,
  full_name text,
  last_name text,
  fonction text,                    -- Poste/fonction de l'utilisateur
  departement text,
  phone text,
  role text,                        -- 'admin', 'user', etc.
  org_id uuid,                      -- Organisation (pour filtrage futur)
  approved boolean DEFAULT false,   -- Utilisateur approuvé?
  disabled boolean DEFAULT false,   -- Compte désactivé?
  created_at timestamp,
  updated_at timestamp
)
```

## 🔧 Personnalisation

### Ajouter de nouveaux rôles

Modifiez les politiques RLS pour ajouter de nouveaux rôles:

```sql
-- Exemple: Rôle "manager" avec accès partiel
CREATE POLICY "Clients: Manager can view own org"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'manager'
      AND org_id = clients.org_id -- Si les clients avaient un org_id
    )
  );
```

### Filtrer par organisation

Si vous voulez que les utilisateurs ne voient que les données de leur organisation:

1. Ajoutez `org_id` aux tables concernées
2. Modifiez les politiques pour vérifier `org_id = current_user_org_id()`

## 🧪 Tester les Permissions

### Test 1: Utilisateur Admin
```sql
-- Connecté comme admin
SELECT count(*) FROM clients; -- Devrait retourner TOUS les clients
```

### Test 2: Utilisateur Normal
```sql
-- Connecté comme user normal
SELECT count(*) FROM clients; -- Devrait retourner TOUS les clients (lecture)
INSERT INTO clients (...); -- Devrait ÉCHOUER (pas de permission)
```

## ⚠️ Important

1. **Toujours tester** les politiques RLS avant de déployer en production
2. **Sauvegarder** votre base de données avant d'appliquer les politiques
3. **Vérifier** que l'utilisateur admin a bien `approved = true`
4. **Ne jamais désactiver** RLS sur les tables en production

## 🆘 Dépannage

### Problème: "Row Level Security policy violation"
- Vérifiez que l'utilisateur a un profil dans `public.users`
- Vérifiez que `approved = true` et `disabled = false`
- Vérifiez que le `role` est correct

### Problème: L'utilisateur ne voit aucune donnée
- Vérifiez que RLS est activé: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;`
- Vérifiez les politiques: `SELECT * FROM pg_policies WHERE schemaname = 'public';`

### Problème: Le badge "Admin" n'apparaît pas
- Vérifiez le profil: `SELECT * FROM public.users WHERE email = 'votre@email.com';`
- Assurez-vous que `role = 'admin'`
- Videz le cache du navigateur et reconnectez-vous

## 📝 Logs et Monitoring

Pour surveiller l'utilisation des permissions:

```sql
-- Voir tous les utilisateurs et leurs rôles
SELECT email, username, role, approved, disabled
FROM public.users
ORDER BY created_at DESC;

-- Voir les utilisateurs admins
SELECT email, username, fonction
FROM public.users
WHERE role = 'admin' AND approved = true;
```
