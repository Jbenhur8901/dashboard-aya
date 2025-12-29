# Deployment Guide - aya Application

Ce guide détaille le déploiement de l'application aya sur votre serveur AWS Lightsail existant (où yanola_ai_frontend est déjà déployé).

## Table des matières

- [Prérequis](#prérequis)
- [Étape 1: Configurer Supabase](#étape-1-configurer-supabase)
- [Étape 2: Se connecter au serveur](#étape-2-se-connecter-au-serveur)
- [Étape 3: Cloner le projet](#étape-3-cloner-le-projet)
- [Étape 4: Configurer les variables d'environnement](#étape-4-configurer-les-variables-denvironnement)
- [Étape 5: Installer et builder l'application](#étape-5-installer-et-builder-lapplication)
- [Étape 6: Configurer PM2](#étape-6-configurer-pm2)
- [Étape 7: Configurer Nginx](#étape-7-configurer-nginx)
- [Étape 8: Configurer le SSL](#étape-8-configurer-le-ssl)
- [Maintenance et mise à jour](#maintenance-et-mise-à-jour)
- [Troubleshooting](#troubleshooting)

---

## Prérequis

Votre serveur Lightsail doit déjà avoir:
- ✅ Ubuntu 22.04 LTS
- ✅ Node.js 20.x
- ✅ PM2 installé globalement
- ✅ Nginx configuré
- ✅ Certbot pour SSL
- ✅ yanola_ai_frontend déjà déployé

Vous aurez besoin de:
- Accès SSH au serveur Lightsail
- Un projet Supabase (nouveau ou existant)
- Un sous-domaine pour cette application (ex: `dashboard.yanolaai.com` ou `aya.yanolaai.com`)
- Accès au repository GitHub

---

## Étape 1: Configurer Supabase

### 1.1 Créer ou utiliser un projet Supabase

**Option A: Nouveau projet**
1. Allez sur [Supabase Dashboard](https://app.supabase.com/)
2. Créez un nouveau projet nommé `aya` ou `test`
3. Notez vos credentials:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon/Public Key
   - Service Role Key (gardez-le secret!)

**Option B: Utiliser le projet existant**
- Vous pouvez utiliser le même projet Supabase que yanola_ai_frontend si les données sont liées

### 1.2 Exécuter les scripts SQL

1. Dans le Supabase Dashboard, allez dans **SQL Editor**

2. **Créer la structure des utilisateurs:**
   - Ouvrez le fichier `supabase-user-sync.sql` de votre projet
   - Copiez et exécutez le script complet
   - Ce script créera:
     - La table `public.users`
     - Le trigger pour la création automatique des profils
     - La fonction `handle_new_user()`

3. **Créer la fonction de tracking des codes promo:**
   - Ouvrez le fichier `supabase-promo-tracking.sql`
   - Copiez et exécutez le script
   - Cette fonction `get_promo_code_tracking()` sera utilisée pour les statistiques

4. **Créer les tables principales:**

```sql
-- Table des souscriptions
CREATE TABLE IF NOT EXISTS public.souscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_police TEXT UNIQUE NOT NULL,
  nom_client TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  produit TEXT NOT NULL,
  prime_ht NUMERIC(10,2),
  prime_ttc NUMERIC(10,2),
  codepromo TEXT,
  date_effet DATE,
  date_echeance DATE,
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'valide', 'rejete', 'annule')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  souscription_id UUID REFERENCES public.souscriptions(id) ON DELETE CASCADE,
  montant NUMERIC(10,2) NOT NULL,
  type_transaction TEXT NOT NULL CHECK (type_transaction IN ('paiement', 'remboursement', 'annulation')),
  methode_paiement TEXT,
  reference TEXT,
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'valide', 'echec')),
  date_transaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des codes promo
CREATE TABLE IF NOT EXISTS public.codes_promo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  taux_reduction NUMERIC(5,2),
  montant_reduction NUMERIC(10,2),
  date_debut DATE,
  date_fin DATE,
  actif BOOLEAN DEFAULT true,
  usage_max INTEGER,
  usage_actuel INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_souscriptions_user_id ON public.souscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_souscriptions_status ON public.souscriptions(status);
CREATE INDEX IF NOT EXISTS idx_souscriptions_codepromo ON public.souscriptions(codepromo);
CREATE INDEX IF NOT EXISTS idx_transactions_souscription_id ON public.transactions(souscription_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_codes_promo_code ON public.codes_promo(code);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_souscriptions_updated_at BEFORE UPDATE ON public.souscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_codes_promo_updated_at BEFORE UPDATE ON public.codes_promo
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.3 Configurer les politiques RLS (Row Level Security)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codes_promo ENABLE ROW LEVEL SECURITY;

-- Politiques pour les utilisateurs (lecture seule pour les users, tout pour les admins)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques pour les souscriptions
CREATE POLICY "Users can view own subscriptions" ON public.souscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.souscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create own subscriptions" ON public.souscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques pour les transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.souscriptions
      WHERE id = souscription_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all transactions" ON public.transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques pour les codes promo
CREATE POLICY "Everyone can view active promo codes" ON public.codes_promo
  FOR SELECT USING (actif = true);

CREATE POLICY "Admins can manage promo codes" ON public.codes_promo
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 1.4 Créer un utilisateur admin

```sql
-- Après avoir créé votre premier compte via l'interface de l'application
-- Exécutez cette requête en remplaçant l'email
UPDATE public.users
SET
  role = 'admin',
  approved = true
WHERE email = 'votre-email@example.com';
```

---

## Étape 2: Se connecter au serveur et créer un nouvel utilisateur

### 2.1 Se connecter au serveur

```bash
# Se connecter via SSH avec l'utilisateur ubuntu (ou yanola-platform)
ssh -i /path/to/your-key.pem ubuntu@YOUR_INSTANCE_IP
```

### 2.2 Créer un nouvel utilisateur pour aya

```bash
# Créer l'utilisateur aya
sudo adduser aya

# Suivez les instructions:
# - Entrez un mot de passe sécurisé
# - Les autres champs (Full Name, etc.) sont optionnels, appuyez sur Enter

# Ajouter l'utilisateur au groupe sudo (recommandé pour gérer Nginx et SSL)
sudo usermod -aG sudo aya

# Vérifier que l'utilisateur est créé
id aya

# Créer le répertoire .ssh pour permettre la connexion SSH directe (optionnel)
sudo mkdir -p /home/aya/.ssh
sudo chown aya:aya /home/aya/.ssh
sudo chmod 700 /home/aya/.ssh
```

**Note:** Si vous souhaitez vous connecter directement avec l'utilisateur `aya` via SSH (au lieu de passer par `ubuntu` puis `su`), vous devrez copier votre clé SSH publique dans `/home/aya/.ssh/authorized_keys`.

### 2.3 Se connecter avec le nouvel utilisateur

```bash
# Basculer vers l'utilisateur aya
su - aya
```

**Avantages de cette approche:**
- ✅ Isolation complète entre yanola_ai_frontend et aya
- ✅ Meilleure sécurité (si une app est compromise, l'autre est protégée)
- ✅ Gestion des permissions et des processus séparée
- ✅ Logs et fichiers organisés par projet

---

## Étape 3: Cloner le projet

### 3.1 Créer le répertoire de travail

```bash
# Créer le répertoire apps pour ce projet
mkdir -p ~/apps
cd ~/apps
```

**Note:** L'utilisateur `yanola-platform` a son propre dossier `~/apps/yanola_ai_frontend`, et l'utilisateur `aya` aura maintenant son propre dossier `~/apps/aya`. Les deux projets sont complètement isolés.

### 3.2 Cloner le nouveau repository

```bash
# Cloner le repository
git clone https://github.com/Jbenhur8901/dashboard-aya.git aya

# Entrer dans le répertoire
cd aya
```

**Note:** J'ai renommé le dossier en `aya` pour plus de clarté. Vous pouvez utiliser le nom que vous voulez.

### 3.3 Vérifier la structure

```bash
ls -la
```

Vous devriez voir: `app/`, `components/`, `hooks/`, `package.json`, etc.

---

## Étape 4: Configurer les variables d'environnement

### 4.1 Créer le fichier .env.local

```bash
nano .env.local
```

### 4.2 Ajouter les variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key-ici

# Node Environment
NODE_ENV=production
```

**Remplacez** les valeurs avec vos vrais credentials Supabase.

Pour obtenir vos credentials:
1. Allez sur [Supabase Dashboard](https://app.supabase.com/)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Copiez:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Sauvegardez et quittez: `Ctrl + X`, puis `Y`, puis `Enter`

### 4.3 Sécuriser le fichier

```bash
chmod 600 .env.local
```

---

## Étape 5: Installer et builder l'application

### 5.1 Installer les dépendances

```bash
npm install
```

Cela peut prendre 2-5 minutes.

### 5.2 Builder l'application

```bash
npm run build
```

Si vous rencontrez des problèmes de mémoire:

```bash
# Augmenter la limite de mémoire Node.js
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

### 5.3 Tester en local (optionnel)

```bash
npm start
```

L'application devrait démarrer sur le port 3000. Appuyez sur `Ctrl + C` pour arrêter.

---

## Étape 6: Configurer PM2

### 6.1 Créer le fichier ecosystem.config.js

```bash
nano ecosystem.config.js
```

### 6.2 Ajouter la configuration PM2

```javascript
module.exports = {
  apps: [{
    name: 'aya',
    script: 'npm',
    args: 'start',
    cwd: '/home/aya/apps/aya',  // Chemin avec le nouvel utilisateur
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001  // Port différent de yanola_ai_frontend (3000)
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

**Important:** Notez que le port est **3001** (différent de 3000 utilisé par yanola_ai_frontend).

Sauvegardez et quittez.

### 6.3 Créer le répertoire logs

```bash
mkdir -p logs
```

### 6.4 Démarrer l'application avec PM2

```bash
pm2 start ecosystem.config.js
```

### 6.5 Configurer PM2 au démarrage pour cet utilisateur

```bash
# Sauvegarder la liste des processus PM2
pm2 save

# Générer le script de démarrage pour l'utilisateur aya
pm2 startup systemd

# Copier et exécuter la commande que PM2 affiche
# Elle ressemblera à quelque chose comme:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u aya --hp /home/aya
```

**Important:** Vous devrez exécuter la commande `sudo` générée par PM2. Cette commande configure PM2 pour démarrer automatiquement les applications de l'utilisateur `aya` au redémarrage du serveur.

### 6.6 Vérifier le statut

```bash
pm2 status
```

Vous devriez voir l'application `aya` (port 3001).

**Note:** Pour voir les processus de `yanola_ai_frontend`, vous devrez vous connecter avec l'utilisateur `yanola-platform` et exécuter `pm2 status`. Chaque utilisateur Linux a sa propre liste de processus PM2.

```bash
# Voir les logs de la nouvelle application
pm2 logs aya --lines 50
```

---

## Étape 7: Configurer Nginx

### 7.1 Configurer le DNS

**Avant de continuer**, configurez votre DNS:

1. Allez dans votre registrar de domaine
2. Créez un enregistrement **A**:
   - Nom: `dashboard` (ou `aya`)
   - Type: `A`
   - Valeur: `VOTRE_IP_LIGHTSAIL`
   - TTL: `300`

Attendez 5-15 minutes pour la propagation DNS.

### 7.2 Créer la configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/aya
```

### 7.3 Ajouter la configuration

```nginx
server {
    listen 80;
    server_name dashboard.yanolaai.com www.dashboard.yanolaai.com;

    # Ou utilisez votre sous-domaine choisi:
    # server_name aya.yanolaai.com www.aya.yanolaai.com;

    location / {
        proxy_pass http://localhost:3001;  # Port 3001 pour aya
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Taille max pour les uploads
    client_max_body_size 50M;
}
```

Sauvegardez et quittez.

### 7.4 Activer le site

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/aya /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 7.5 Vérifier que Nginx fonctionne

```bash
sudo systemctl status nginx
```

---

## Étape 8: Configurer le SSL

### 8.1 Obtenir le certificat SSL

```bash
sudo certbot --nginx -d dashboard.yanolaai.com -d www.dashboard.yanolaai.com
```

**Remplacez** `dashboard.yanolaai.com` par votre sous-domaine.

Suivez les instructions:
1. Entrez votre email
2. Acceptez les conditions
3. Choisissez de rediriger HTTP vers HTTPS (recommandé: Oui)

### 8.2 Vérifier le renouvellement automatique

```bash
sudo certbot renew --dry-run
```

### 8.3 Accéder à votre application

Ouvrez votre navigateur:
- **Avec SSL:** `https://dashboard.yanolaai.com`
- **Sans SSL (temporaire):** `http://YOUR_IP:3001`

---

## Maintenance et mise à jour

### Mettre à jour l'application

```bash
# Se connecter avec l'utilisateur aya
ssh -i /path/to/key.pem ubuntu@YOUR_IP
su - aya

# Aller dans le répertoire
cd ~/apps/aya

# Récupérer les dernières modifications
git pull

# Installer les nouvelles dépendances
npm install

# Rebuild
npm run build

# Redémarrer avec PM2
pm2 restart aya

# Vérifier les logs
pm2 logs aya --lines 20
```

### Commandes utiles

```bash
# Voir le statut de toutes les applications
pm2 status

# Voir les logs d'aya
pm2 logs aya

# Redémarrer aya
pm2 restart aya

# Arrêter aya
pm2 stop aya

# Supprimer aya de PM2
pm2 delete aya

# Vérifier l'utilisation des ressources
pm2 monit

# Voir les logs Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Monitoring

```bash
# Utilisation disque
df -h

# Utilisation mémoire
free -h

# Processus Node.js de tous les utilisateurs (nécessite sudo)
sudo ps aux | grep node

# Vérifier les ports utilisés
sudo lsof -i :3000  # yanola_ai_frontend (utilisateur yanola-platform)
sudo lsof -i :3001  # aya (utilisateur aya)

# Voir tous les processus PM2 de tous les utilisateurs
sudo pm2 list
```

### Surveiller les deux applications

```bash
# Option 1: Depuis l'utilisateur ubuntu avec sudo
sudo pm2 list  # Voir tous les processus PM2 de tous les utilisateurs

# Option 2: Basculer entre les utilisateurs
# Pour voir les processus de yanola_ai_frontend
su - yanola-platform
pm2 status
exit

# Pour voir les processus d'aya
su - aya
pm2 status
exit
```

---

## Troubleshooting

### L'application ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs aya --lines 100

# Vérifier si le port 3001 est utilisé
sudo lsof -i :3001

# Si le port est occupé, tuer le processus
sudo kill -9 <PID>

# Redémarrer
pm2 restart aya
```

### Erreur de connexion Supabase

1. Vérifiez `.env.local`:
   ```bash
   cat .env.local
   ```

2. Vérifiez que les URLs et clés sont correctes

3. Testez la connexion Supabase dans le dashboard

4. Vérifiez les politiques RLS dans Supabase

### Erreur Nginx

```bash
# Tester la configuration
sudo nginx -t

# Voir les erreurs
sudo tail -f /var/log/nginx/error.log

# Redémarrer Nginx
sudo systemctl restart nginx
```

### Erreur SSL

```bash
# Vérifier les certificats
sudo certbot certificates

# Renouveler manuellement
sudo certbot renew

# Vérifier la configuration Nginx
sudo cat /etc/nginx/sites-available/aya
```

### Manque de mémoire

```bash
# Vérifier la mémoire
free -h

# Si nécessaire, créer un swap file (si pas déjà fait)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendre permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### L'application est lente

1. **Vérifier les ressources:**
   ```bash
   pm2 monit
   htop  # ou top
   ```

2. **Optimiser Nginx** (déjà fait normalement)

3. **Upgrade l'instance Lightsail:**
   - Créer un snapshot
   - Créer une nouvelle instance avec plus de RAM/CPU
   - Restaurer le snapshot

### Erreurs de base de données

1. Vérifiez les logs Supabase dans le dashboard

2. Vérifiez que les tables existent:
   - `users`
   - `souscriptions`
   - `transactions`
   - `codes_promo`

3. Vérifiez les politiques RLS

4. Testez avec le SQL Editor de Supabase

---

## Gestion Multi-Utilisateurs

### Vue d'ensemble

Avec cette architecture, vous avez deux utilisateurs Linux séparés:

| Aspect | yanola-platform | aya |
|--------|----------------|-----------|
| Application | yanola_ai_frontend | aya |
| Dossier | /home/yanola-platform/apps/yanola_ai_frontend | /home/aya/apps/aya |
| Port | 3000 | 3001 |
| PM2 | Instance séparée | Instance séparée |
| Domaine | platform.yanolaai.com | dashboard.yanolaai.com |

### Avantages de cette approche

1. **Isolation:** Si une application a un problème, l'autre n'est pas affectée
2. **Sécurité:** Chaque utilisateur ne peut accéder qu'à ses propres fichiers
3. **Clarté:** Les logs, processus et fichiers sont bien organisés
4. **Permissions:** Gestion granulaire des droits d'accès

### Bonnes pratiques

```bash
# ✅ FAIRE: Se connecter avec le bon utilisateur pour chaque tâche
su - aya && cd ~/apps/aya && pm2 logs aya

# ❌ NE PAS FAIRE: Essayer de gérer l'application d'un autre utilisateur
su - yanola-platform && pm2 restart aya  # Cela ne fonctionnera pas!

# ✅ FAIRE: Utiliser sudo pour voir tous les processus
sudo pm2 list  # Voir tous les processus PM2

# ✅ FAIRE: Utiliser sudo pour les tâches système (Nginx, SSL, etc.)
sudo systemctl restart nginx
sudo certbot renew
```

---

## FAQ

### Comment ajouter une troisième application?

1. Créer un nouvel utilisateur (ex: `newapp`)
2. Suivre les mêmes étapes que pour aya
3. Utiliser un nouveau port (ex: 3002)
4. Configurer un nouveau virtual host Nginx

### Puis-je voir les logs des deux applications en même temps?

Oui, avec sudo:
```bash
# Logs combinés de tous les processus PM2
sudo pm2 logs

# Logs d'une application spécifique
sudo pm2 logs aya
sudo pm2 logs yanola_ai_frontend
```

### Comment sauvegarder les deux applications?

```bash
# Pour yanola_ai_frontend
su - yanola-platform
cd ~/apps/yanola_ai_frontend
tar -czf ~/yanola-backup-$(date +%Y%m%d).tar.gz .
exit

# Pour aya
su - aya
cd ~/apps/aya
tar -czf ~/aya-backup-$(date +%Y%m%d).tar.gz .
exit
```

### Les deux applications partagent-elles la même base de données Supabase?

Cela dépend de votre configuration:
- **Même projet Supabase:** Utilisez les mêmes credentials dans `.env.local` des deux applications
- **Projets séparés:** Utilisez des credentials différents pour chaque application

### Comment redémarrer les deux applications en même temps?

```bash
# Option 1: Avec sudo (recommandé)
sudo pm2 restart all

# Option 2: Manuellement pour chaque utilisateur
su - yanola-platform && pm2 restart yanola_ai_frontend && exit
su - aya && pm2 restart aya && exit
```

---

## Sécurité

### Checklist de sécurité

- ✅ `.env.local` ne doit PAS être commité dans Git
- ✅ Utilisez des mots de passe forts pour Supabase
- ✅ Activez RLS sur toutes les tables Supabase
- ✅ SSL activé avec Let's Encrypt
- ✅ Firewall UFW configuré
- ✅ Mettez à jour régulièrement le système
- ✅ Surveillez les logs régulièrement

### Mise à jour du système

```bash
# Mettre à jour Ubuntu
sudo apt update && sudo apt upgrade -y

# Mettre à jour Node.js (si nécessaire)
# Vérifier la version actuelle
node --version

# Mettre à jour PM2
sudo npm install -g pm2@latest
pm2 update
```

---

## Architecture finale

Après ce déploiement, votre serveur Lightsail aura:

```
Serveur Lightsail (13.39.245.32)
│
├── Utilisateur: yanola-platform
│   └── Application: yanola_ai_frontend
│       ├── Dossier: /home/yanola-platform/apps/yanola_ai_frontend
│       ├── Port: 3000
│       ├── PM2 Process: yanola_ai_frontend
│       ├── Nginx: platform.yanolaai.com
│       └── SSL: ✓
│
└── Utilisateur: aya
    └── Application: aya
        ├── Dossier: /home/aya/apps/aya
        ├── Port: 3001
        ├── PM2 Process: aya
        ├── Nginx: dashboard.yanolaai.com
        └── SSL: ✓
```

**Avantages de cette architecture:**
- ✅ Isolation complète entre les deux projets
- ✅ Chaque utilisateur gère ses propres processus PM2
- ✅ Permissions et sécurité séparées
- ✅ Facilite la maintenance et le débogage

---

## Commandes de référence rapide

### Pour l'application aya

```bash
# Se connecter au serveur avec l'utilisateur aya
ssh -i /path/to/key.pem ubuntu@YOUR_IP
su - aya

# Voir les applications de cet utilisateur
pm2 status

# Logs d'aya
pm2 logs aya

# Mettre à jour aya
cd ~/apps/aya && git pull && npm install && npm run build && pm2 restart aya

# Redémarrer l'application
pm2 restart aya
```

### Pour l'application yanola_ai_frontend

```bash
# Se connecter avec l'utilisateur yanola-platform
ssh -i /path/to/key.pem ubuntu@YOUR_IP
su - yanola-platform

# Voir les applications de cet utilisateur
pm2 status

# Gérer yanola_ai_frontend
pm2 restart yanola_ai_frontend
pm2 logs yanola_ai_frontend
```

### Commandes globales (nécessitent sudo)

```bash
# Vérifier Nginx (depuis n'importe quel utilisateur avec sudo)
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx

# Renouveler SSL (depuis n'importe quel utilisateur avec sudo)
sudo certbot renew

# Voir tous les processus Node.js sur le serveur
ps aux | grep node
```

---

## Support

Pour plus d'aide:

- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **PM2:** https://pm2.keymetrics.io/docs/
- **Nginx:** https://nginx.org/en/docs/

---

## Conclusion

Votre application aya est maintenant déployée sur Lightsail avec une architecture multi-utilisateurs sécurisée!

### Récapitulatif du déploiement

✅ **Ce qui a été configuré:**
- Création d'un utilisateur Linux dédié `aya`
- Déploiement de l'application sur le port 3001
- Configuration de Supabase avec tables et politiques RLS
- Configuration PM2 pour le démarrage automatique
- Configuration Nginx avec virtual host dédié
- Installation du certificat SSL avec Let's Encrypt
- Isolation complète d'avec yanola_ai_frontend

### État final de votre serveur

```
🖥️ Serveur Lightsail (13.39.245.32)
│
├─ 👤 Utilisateur: yanola-platform
│  └─ 🚀 yanola_ai_frontend → https://platform.yanolaai.com (Port 3000)
│
└─ 👤 Utilisateur: aya
   └─ 🚀 aya → https://dashboard.yanolaai.com (Port 3001)
```

**Avantages de cette architecture:**
- ✅ Isolation complète entre les deux applications
- ✅ Sécurité renforcée (permissions séparées)
- ✅ Gestion indépendante des processus PM2
- ✅ Facilité de maintenance et de débogage

### Prochaines étapes recommandées

1. ✅ **Tester l'application** - Vérifier toutes les fonctionnalités
2. ✅ **Créer un compte admin** - S'inscrire et exécuter la requête SQL de promotion
3. ✅ **Importer des données** - Ajouter vos souscriptions, transactions, codes promo
4. ✅ **Configurer les sauvegardes** - Automatiser les backups Supabase
5. ✅ **Mettre en place le monitoring** - Surveiller les performances
6. ✅ **Documentation métier** - Documenter vos processus

### Commandes quotidiennes

**Gérer aya:**
```bash
ssh -i /path/to/key.pem ubuntu@YOUR_IP
su - aya
pm2 status
pm2 logs aya
```

**Mettre à jour aya:**
```bash
su - aya
cd ~/apps/aya && git pull && npm install && npm run build && pm2 restart aya
```

**Gérer le serveur (Nginx, SSL):**
```bash
sudo systemctl status nginx
sudo certbot renew
sudo pm2 list  # Voir toutes les applications
```

### URLs de votre déploiement

- **Application aya:** `https://dashboard.yanolaai.com`
- **Application yanola_ai_frontend:** `https://platform.yanolaai.com`
- **Dashboard Supabase:** `https://app.supabase.com`

### En cas de problème

1. Consultez la section [Troubleshooting](#troubleshooting)
2. Vérifiez les logs: `pm2 logs aya`
3. Vérifiez Nginx: `sudo tail -f /var/log/nginx/error.log`
4. Vérifiez Supabase pour les erreurs de base de données

---

**Félicitations! Votre déploiement multi-applications est terminé!** 🎉

Vous avez maintenant deux applications Next.js fonctionnant de manière isolée et sécurisée sur le même serveur Lightsail, avec SSL activé et gestion par PM2.

Bon déploiement! 🚀
