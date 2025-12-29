# Deployment Guide - AssurDash Application

Ce guide détaille le déploiement de l'application AssurDash sur votre serveur AWS Lightsail existant (où yanola_ai_frontend est déjà déployé).

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
- Un sous-domaine pour cette application (ex: `dashboard.yanolaai.com` ou `assurdash.yanolaai.com`)
- Accès au repository GitHub

---

## Étape 1: Configurer Supabase

### 1.1 Créer ou utiliser un projet Supabase

**Option A: Nouveau projet**
1. Allez sur [Supabase Dashboard](https://app.supabase.com/)
2. Créez un nouveau projet nommé `assurdash` ou `test`
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

## Étape 2: Se connecter au serveur

```bash
# Se connecter via SSH
ssh -i /path/to/your-key.pem ubuntu@YOUR_INSTANCE_IP

# Ou si vous utilisez l'utilisateur yanola-platform
ssh -i /path/to/your-key.pem yanola-platform@YOUR_INSTANCE_IP
```

---

## Étape 3: Cloner le projet

### 3.1 Naviguer vers le répertoire apps

```bash
cd ~/apps
```

Vous devriez déjà avoir `yanola_ai_frontend` dans ce répertoire.

### 3.2 Cloner le nouveau repository

```bash
# Cloner le repository
git clone https://github.com/Jbenhur8901/test.git assurdash

# Entrer dans le répertoire
cd assurdash
```

**Note:** J'ai renommé le dossier en `assurdash` pour plus de clarté. Vous pouvez utiliser le nom que vous voulez.

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
    name: 'assurdash',
    script: 'npm',
    args: 'start',
    cwd: '/home/yanola-platform/apps/assurdash',
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

### 6.5 Sauvegarder la configuration PM2

```bash
pm2 save
```

### 6.6 Vérifier le statut

```bash
pm2 status
```

Vous devriez voir **deux** applications:
- `yanola_ai_frontend` (port 3000)
- `assurdash` (port 3001)

```bash
# Voir les logs de la nouvelle application
pm2 logs assurdash --lines 50
```

---

## Étape 7: Configurer Nginx

### 7.1 Configurer le DNS

**Avant de continuer**, configurez votre DNS:

1. Allez dans votre registrar de domaine
2. Créez un enregistrement **A**:
   - Nom: `dashboard` (ou `assurdash`)
   - Type: `A`
   - Valeur: `VOTRE_IP_LIGHTSAIL`
   - TTL: `300`

Attendez 5-15 minutes pour la propagation DNS.

### 7.2 Créer la configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/assurdash
```

### 7.3 Ajouter la configuration

```nginx
server {
    listen 80;
    server_name dashboard.yanolaai.com www.dashboard.yanolaai.com;

    # Ou utilisez votre sous-domaine choisi:
    # server_name assurdash.yanolaai.com www.assurdash.yanolaai.com;

    location / {
        proxy_pass http://localhost:3001;  # Port 3001 pour assurdash
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
sudo ln -s /etc/nginx/sites-available/assurdash /etc/nginx/sites-enabled/

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
# Aller dans le répertoire
cd ~/apps/assurdash

# Récupérer les dernières modifications
git pull

# Installer les nouvelles dépendances
npm install

# Rebuild
npm run build

# Redémarrer avec PM2
pm2 restart assurdash

# Vérifier les logs
pm2 logs assurdash --lines 20
```

### Commandes utiles

```bash
# Voir le statut de toutes les applications
pm2 status

# Voir les logs d'assurdash
pm2 logs assurdash

# Redémarrer assurdash
pm2 restart assurdash

# Arrêter assurdash
pm2 stop assurdash

# Supprimer assurdash de PM2
pm2 delete assurdash

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

# Processus Node.js
ps aux | grep node

# Vérifier les ports utilisés
sudo lsof -i :3000  # yanola_ai_frontend
sudo lsof -i :3001  # assurdash
```

---

## Troubleshooting

### L'application ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs assurdash --lines 100

# Vérifier si le port 3001 est utilisé
sudo lsof -i :3001

# Si le port est occupé, tuer le processus
sudo kill -9 <PID>

# Redémarrer
pm2 restart assurdash
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
sudo cat /etc/nginx/sites-available/assurdash
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
├── Application 1: yanola_ai_frontend
│   ├── Port: 3000
│   ├── PM2 Process: yanola_ai_frontend
│   ├── Nginx: platform.yanolaai.com
│   └── SSL: ✓
│
└── Application 2: assurdash
    ├── Port: 3001
    ├── PM2 Process: assurdash
    ├── Nginx: dashboard.yanolaai.com
    └── SSL: ✓
```

---

## Commandes de référence rapide

```bash
# Se connecter au serveur
ssh -i /path/to/key.pem yanola-platform@YOUR_IP

# Voir toutes les applications
pm2 status

# Logs d'assurdash
pm2 logs assurdash

# Mettre à jour assurdash
cd ~/apps/assurdash && git pull && npm install && npm run build && pm2 restart assurdash

# Redémarrer toutes les applications
pm2 restart all

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# Renouveler SSL
sudo certbot renew
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

Votre application AssurDash est maintenant déployée sur Lightsail aux côtés de yanola_ai_frontend!

**Prochaines étapes recommandées:**

1. ✅ Tester toutes les fonctionnalités de l'application
2. ✅ Créer votre compte admin via l'interface
3. ✅ Exécuter la requête SQL pour promouvoir votre compte en admin
4. ✅ Configurer les sauvegardes automatiques Supabase
5. ✅ Mettre en place un monitoring (optionnel)
6. ✅ Documenter vos processus métier

**URLs de votre déploiement:**
- Application yanola_ai_frontend: `https://platform.yanolaai.com`
- Application assurdash: `https://dashboard.yanolaai.com`
- Dashboard Supabase: `https://app.supabase.com`

Bon déploiement! 🚀
