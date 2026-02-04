# AssurDash - Dashboard d'Assurance

Dashboard moderne et fonctionnel pour la gestion d'assurance avec Next.js, TypeScript, Tailwind CSS et Supabase.

## Fonctionnalités

### Pages Principales

1. **Dashboard (Accueil)**
   - Vue d'ensemble avec 4 cartes de statistiques
   - Graphique des souscriptions par type de produit (Auto, Voyage, MRH, IAC)
   - Graphique des revenus des 6 derniers mois
   - Liste des 5 dernières souscriptions avec statut

2. **Souscriptions**
   - Tableau avec filtres par type de produit, statut et période
   - Détails complets selon le type (auto/voyage/mrh/iac)
   - Badge coloré pour chaque statut
   - Pagination et recherche

3. **Clients**
   - Tableau des clients avec informations complètes
   - Nombre de souscriptions par client
   - Recherche par nom ou numéro
   - Historique des souscriptions d'un client

4. **Transactions**
   - Tableau avec filtres par statut et méthode de paiement
   - Badge coloré selon le statut (success, pending, failed)
   - Somme totale visible

5. **Codes Promo**
   - Tableau des codes promo avec toutes les informations
   - Formulaire pour ajouter un nouveau code
   - Bouton de désactivation/activation
   - Indicateur visuel pour codes expirés

6. **Documents**
   - Liste des documents par souscription
   - Prévisualisation et téléchargement direct
   - Statistiques par type de document

## Stack Technique

- **Frontend**: Next.js 16 avec TypeScript
- **Styling**: Tailwind CSS
- **Composants UI**: shadcn/ui
- **Graphiques**: Recharts
- **Backend**: Supabase
- **État**: React Query (TanStack Query)
- **Icônes**: Lucide React

## Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd test
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Configurer Supabase**

Créez les tables suivantes dans votre projet Supabase :

```sql
-- Table clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone_whatsapp TEXT NOT NULL,
  profession TEXT,
  ville TEXT,
  statut TEXT DEFAULT 'actif',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table souscriptions
CREATE TABLE souscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  producttype TEXT NOT NULL CHECK (producttype IN ('auto', 'voyage', 'mrh', 'iac')),
  prime_ttc NUMERIC NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('en_cours', 'validee', 'expiree', 'annulee', 'en_attente')),

  -- Champs Auto
  marque TEXT,
  modele TEXT,
  immatriculation TEXT,
  annee INTEGER,
  valeur_vehicule NUMERIC,

  -- Champs Voyage
  destination TEXT,
  date_depart DATE,
  date_retour DATE,
  nombre_voyageurs INTEGER,

  -- Champs MRH
  adresse_bien TEXT,
  type_bien TEXT,
  surface NUMERIC,
  valeur_bien NUMERIC,

  -- Champs IAC
  montant_capital NUMERIC,
  beneficiaires TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  souscription_id UUID REFERENCES souscriptions(id),
  reference TEXT NOT NULL UNIQUE,
  montant NUMERIC NOT NULL,
  methode_paiement TEXT NOT NULL CHECK (methode_paiement IN ('mobile_money', 'carte_bancaire', 'especes', 'virement')),
  statut TEXT NOT NULL CHECK (statut IN ('success', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table codes_promo
CREATE TABLE codes_promo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  agent TEXT NOT NULL,
  type_reduction TEXT NOT NULL CHECK (type_reduction IN ('pourcentage', 'montant_fixe')),
  valeur NUMERIC NOT NULL,
  date_expiration DATE NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  souscription_id UUID REFERENCES souscriptions(id),
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

5. **Lancer le serveur de développement**

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Scripts Disponibles

- `npm run dev` - Lance le serveur de développement avec Turbopack
- `npm run build` - Crée la version de production
- `npm run start` - Lance le serveur de production
- `npm run lint` - Vérifie le code avec ESLint

## Structure du Projet

```
.
├── app/                      # Pages Next.js (App Router)
│   ├── page.tsx             # Dashboard
│   ├── souscriptions/       # Page Souscriptions
│   ├── clients/             # Page Clients
│   ├── transactions/        # Page Transactions
│   ├── codes-promo/         # Page Codes Promo
│   ├── documents/           # Page Documents
│   ├── layout.tsx           # Layout principal
│   └── globals.css          # Styles globaux
├── components/              # Composants React
│   ├── ui/                  # Composants shadcn/ui
│   ├── dashboard/           # Composants spécifiques au dashboard
│   ├── sidebar.tsx          # Barre latérale de navigation
│   └── header.tsx           # En-tête
├── hooks/                   # Hooks personnalisés
│   ├── use-dashboard-data.ts
│   ├── use-theme.ts
│   └── use-toast.ts
├── lib/                     # Utilitaires
│   ├── supabase.ts         # Client Supabase
│   ├── providers.tsx       # Providers React Query
│   └── utils.ts            # Fonctions utilitaires
├── types/                   # Types TypeScript
│   └── database.types.ts   # Types de la base de données
└── public/                  # Fichiers statiques
```

## Palette de Couleurs

- **Santé**: Jaune/Orange (#F59E0B)
- **Business/IAC**: Violet (#8B5CF6)
- **Auto**: Vert (#10B981)
- **Voyage**: Bleu (#3B82F6)

## Fonctionnalités Techniques

- Connexion Supabase configurée avec les tables du schéma
- Requêtes optimisées avec jointures (clients ↔ souscriptions ↔ transactions)
- Gestion d'erreurs et états de chargement
- Toast notifications pour les actions
- Dark mode optionnel
- Responsive design (mobile-friendly)

## Contribution

Pour contribuer au projet :

1. Fork le projet
2. Créez votre branche de fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## License

Ce projet est sous licence MIT.
