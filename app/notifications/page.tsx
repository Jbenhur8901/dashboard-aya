"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, CheckCircle2, AlertTriangle, Info, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type NotificationTone = "success" | "warning" | "info"

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  tone: NotificationTone
}

const seedNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Souscription validée",
    description: "Dossier Auto #SA-2481",
    time: "Il y a 6 min",
    read: false,
    tone: "success",
  },
  {
    id: "n2",
    title: "Paiement en attente",
    description: "Transaction #TR-1820",
    time: "Il y a 32 min",
    read: false,
    tone: "warning",
  },
  {
    id: "n3",
    title: "Document ajouté",
    description: "Police MRH - PDF",
    time: "Hier",
    read: true,
    tone: "info",
  },
  {
    id: "n4",
    title: "Code agent créé",
    description: "AGENT-NSIA-008",
    time: "Avant-hier",
    read: true,
    tone: "success",
  },
]

const toneIcon: Record<NotificationTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
}

export default function NotificationsPage() {
  const [query, setQuery] = useState("")
  const [showUnread, setShowUnread] = useState(false)

  const notifications = useMemo(() => {
    const filtered = seedNotifications.filter((item) => {
      const matchesQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      const matchesUnread = showUnread ? !item.read : true
      return matchesQuery && matchesUnread
    })
    return filtered
  }, [query, showUnread])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="title-display">Notifications</h1>
          <p className="subtitle">Suivez l’activité en temps réel</p>
        </div>
      </div>

      <Card className="animate-fade-up">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Centre de notifications</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant={showUnread ? "default" : "outline"}
              onClick={() => setShowUnread((prev) => !prev)}
            >
              {showUnread ? "Voir tout" : "Non lues"}
            </Button>
            <Button variant="outline">Tout marquer comme lu</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            notifications.map((item) => {
              const Icon = toneIcon[item.tone]
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border p-4 transition-colors",
                    item.read ? "bg-muted/30" : "bg-background"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border",
                      item.tone === "success" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
                      item.tone === "warning" && "bg-amber-500/10 text-amber-700 border-amber-500/20",
                      item.tone === "info" && "bg-sky-500/10 text-sky-700 border-sky-500/20"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      {!item.read && <Badge variant="secondary">Nouveau</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
