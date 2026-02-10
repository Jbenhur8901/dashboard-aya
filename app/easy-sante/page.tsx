'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type BooleanChoice = 'oui' | 'non' | ''

interface EasySanteForm {
  nom_du_groupement: string
  personne_de_contact: string
  telephone: string
  nature_du_groupement: string
  nombre_de_personnes: string
  composition_du_groupe: string
  petits_risques: string
  grands_risques: string
  limite_geographique: string
  confirmation_de_prise_en_charge: BooleanChoice
  confirmation_de_plafond: BooleanChoice
  plafonds_familiale: string
  delais_de_carence: string
  delais_de_carence_accident: string
  maladie_exclus: string
  questionnaire_medical: string
  refus_acceptation: string
  prime: string
  accord_avec_le_groupement: BooleanChoice
  validation_finale: BooleanChoice
  decision: string
  date_de_couverture: string
  date_echance: string
  nom_du_prospect: string
  attestation_information: string
}

const initialForm: EasySanteForm = {
  nom_du_groupement: '',
  personne_de_contact: '',
  telephone: '',
  nature_du_groupement: '',
  nombre_de_personnes: '',
  composition_du_groupe: '',
  petits_risques: '',
  grands_risques: '',
  limite_geographique: '',
  confirmation_de_prise_en_charge: '',
  confirmation_de_plafond: '',
  plafonds_familiale: '',
  delais_de_carence: '',
  delais_de_carence_accident: '',
  maladie_exclus: '',
  questionnaire_medical: '',
  refus_acceptation: '',
  prime: '',
  accord_avec_le_groupement: '',
  validation_finale: '',
  decision: '',
  date_de_couverture: '',
  date_echance: '',
  nom_du_prospect: '',
  attestation_information: '',
}

export default function EasySantePage() {
  const [form, setForm] = useState<EasySanteForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [primeValue, setPrimeValue] = useState<string>('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const toStartOfDayIso = (value: string) => {
    const d = new Date(value)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  const toEndOfDayIso = (value: string) => {
    const d = new Date(value)
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
  }

  const toChoice = (value: boolean | null) => {
    if (value === true) return 'oui'
    if (value === false) return 'non'
    return ''
  }

  const hydrateForm = (record: any) => {
    setForm({
      nom_du_groupement: record.nom_du_groupement || '',
      personne_de_contact: record.personne_de_contact || '',
      telephone: record.telephone || '',
      nature_du_groupement: record.nature_du_groupement || '',
      nombre_de_personnes: record.nombre_de_personnes ? String(record.nombre_de_personnes) : '',
      composition_du_groupe: record.composition_du_groupe || '',
      petits_risques: record.petits_risques || '',
      grands_risques: record.grands_risques || '',
      limite_geographique: record.limite_geographique || '',
      confirmation_de_prise_en_charge: toChoice(record.confirmation_de_prise_en_charge),
      confirmation_de_plafond: toChoice(record.confirmation_de_plafond),
      plafonds_familiale: record.plafonds_familiale || '',
      delais_de_carence: record.delais_de_carence || '',
      delais_de_carence_accident: record.delais_de_carence_accident || '',
      maladie_exclus: record.maladie_exclus || '',
      questionnaire_medical: record.questionnaire_medical || '',
      refus_acceptation: record.refus_acceptation || '',
      prime: record.prime ? String(record.prime) : '',
      accord_avec_le_groupement: toChoice(record.accord_avec_le_groupement),
      validation_finale: toChoice(record.validation_finale),
      decision: record.decision || '',
      date_de_couverture: record.date_de_couverture || '',
      date_echance: record.date_echance || '',
      nom_du_prospect: record.nom_du_prospect || '',
      attestation_information: record.attestation_information || '',
    })
  }

  const handlePrint = () => {}
  const toYesNoLabel = (value: BooleanChoice) => {
    if (value === 'oui') return 'Oui'
    if (value === 'non') return 'Non'
    return ''
  }

  const { data: rows, isLoading } = useQuery({
    queryKey: ['souscription-easysante', search, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('souscription_easysante')
        .select(`
          *,
          souscription:souscriptions(
            id,
            client:clients(*)
          )
        `)
        .order('created_at', { ascending: false })

      if (dateFrom) {
        query = query.gte('created_at', toStartOfDayIso(dateFrom))
      }
      if (dateTo) {
        query = query.lte('created_at', toEndOfDayIso(dateTo))
      }

      const { data } = await query

      const allRows = data || []
      const q = search.trim().toLowerCase()
      if (!q) return allRows
      return allRows.filter((row: any) => {
        const fields = [
          row.nom_du_groupement,
          row.personne_de_contact,
          row.telephone,
          row.nom_du_prospect,
          row.souscription?.client?.fullname,
        ]
        return fields.some((v: string) => (v || '').toLowerCase().includes(q))
      })
    },
  })

  const selectedRow = useMemo(() => {
    return rows?.find((r: any) => r.id === selectedId) || null
  }, [rows, selectedId])

  useEffect(() => {
    if (!selectedRow) return
    hydrateForm(selectedRow)
    setPrimeValue(selectedRow.prime ? String(selectedRow.prime) : '')
  }, [selectedRow])

  const handleSavePrime = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('souscription_easysante')
        .update({
          prime: primeValue ? Number(primeValue) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedId)

      if (error) throw error
      toast({
        title: 'Prime mise à jour',
        description: 'La prime a été enregistrée.',
      })
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour la prime',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGeneratePdf = async () => {
    if (!selectedRow) return
    setGeneratingPdf(true)
    try {
      const formPayload = {
        nomDuGroupement: form.nom_du_groupement,
        personneDeContact: form.personne_de_contact,
        telephone: form.telephone,
        natureDuGroupement: form.nature_du_groupement,
        nombreDePersonnes: form.nombre_de_personnes,
        compositionDuGroupe: form.composition_du_groupe,
        petitsRisques: form.petits_risques,
        grandsRisques: form.grands_risques,
        Limitegeographique: form.limite_geographique,
        confirmationDePriseEnCharge: toYesNoLabel(form.confirmation_de_prise_en_charge),
        confirmationDePlafond: toYesNoLabel(form.confirmation_de_plafond),
        plafondsFamiliale: form.plafonds_familiale,
        delaisDeCarence: form.delais_de_carence,
        delaisDeCarence_Accident: form.delais_de_carence_accident,
        maladieExclus: form.maladie_exclus,
        questionnaireMedical: form.questionnaire_medical,
        refusAcceptation: form.refus_acceptation,
        prime: primeValue || form.prime,
        accordaveclegroupement: toYesNoLabel(form.accord_avec_le_groupement),
        validationFinale: toYesNoLabel(form.validation_finale),
        decision: form.decision,
        dateDeCouverture: form.date_de_couverture,
        dateEchance: form.date_echance,
        nomduProspect: form.nom_du_prospect,
        attestationInformation: form.attestation_information,
      }

      const formData = new FormData()
      formData.append('form_data', JSON.stringify(formPayload))

      const response = await fetch('https://api.yanolaai.com/generate_easy_sante_form/', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }

      const payload = (await response.json()) as {
        pdf_url?: string
        reference_number?: string
      }

      if (!payload.pdf_url) {
        throw new Error('PDF indisponible')
      }

      if (payload.reference_number) {
        const { error: updateReferenceError } = await supabase
          .from('souscription_easysante')
          .update({
            reference: payload.reference_number,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedRow.id)

        if (updateReferenceError) throw updateReferenceError
      }

      const documentPayload = {
        souscription_id: selectedRow.souscription?.id || null,
        document_url: payload.pdf_url,
        pdf_url: payload.pdf_url,
        type: 'pdf',
        nom: payload.reference_number || `Easy Santé ${selectedRow.id}`,
        updated_at: new Date().toISOString(),
      }

      const { data: existingDocument, error: existingDocumentError } = await supabase
        .from('documents')
        .select('id')
        .eq('document_url', payload.pdf_url)
        .maybeSingle()

      if (existingDocumentError) throw existingDocumentError

      if (existingDocument?.id) {
        const { error: updateDocumentError } = await supabase
          .from('documents')
          .update(documentPayload)
          .eq('id', existingDocument.id)

        if (updateDocumentError) throw updateDocumentError
      } else {
        const { error: insertDocumentError } = await supabase
          .from('documents')
          .insert({
            ...documentPayload,
            created_at: new Date().toISOString(),
          })

        if (insertDocumentError) throw insertDocumentError
      }

      const link = document.createElement('a')
      link.href = payload.pdf_url
      link.download = `${payload.reference_number || `easy-sante-${selectedRow.id}`}.pdf`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.click()

      queryClient.invalidateQueries({ queryKey: ['souscription-easysante'] })
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer le PDF',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="title-display">Easy Santé</h1>
          <p className="subtitle">Liste des souscriptions Easy Santé</p>
        </div>
      </div>

      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5 items-end">
            <Input
              placeholder="Rechercher par groupement, contact, téléphone, prospect ou client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="space-y-1.5">
              <Label htmlFor="dateFromEasySante">Du</Label>
              <Input
                id="dateFromEasySante"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateToEasySante">Au</Label>
              <Input
                id="dateToEasySante"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex md:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('')
                  setDateFrom('')
                  setDateTo('')
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-up">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Groupement</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : rows?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Aucun dossier Easy Santé
                  </TableCell>
                </TableRow>
              ) : (
                rows?.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.nom_du_groupement || 'N/A'}</TableCell>
                    <TableCell>{row.personne_de_contact || 'N/A'}</TableCell>
                    <TableCell>{row.telephone || 'N/A'}</TableCell>
                    <TableCell>{row.nom_du_prospect || 'N/A'}</TableCell>
                    <TableCell>{row.reference || 'N/A'}</TableCell>
                    <TableCell>
                      {row.created_at
                        ? format(new Date(row.created_at), 'dd MMM yyyy', { locale: fr })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedId(row.id)}
                      >
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-4xl print:max-w-none max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fiche Easy Santé</DialogTitle>
          </DialogHeader>

          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf}>
              {generatingPdf ? 'Génération...' : 'Générer le PDF'}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/20">
              <div className="text-sm font-medium">Informations client</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {selectedRow?.souscription?.client
                  ? `${selectedRow.souscription.client.fullname || 'N/A'} · ${selectedRow.souscription.client.phone || 'N/A'}`
                  : 'Aucune information client'}
              </div>
            </div>
          </div>

          <Card className="print:shadow-none print:border-none">
            <CardHeader className="print:pb-2">
              <CardTitle>Formulaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom du groupement</Label>
                  <Input value={form.nom_du_groupement} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Personne de contact</Label>
                  <Input value={form.personne_de_contact} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={form.telephone} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Nature du groupement</Label>
                  <Input value={form.nature_du_groupement} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Nombre de personnes</Label>
                  <Input value={form.nombre_de_personnes} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Composition du groupe</Label>
                  <Input value={form.composition_du_groupe} readOnly />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Petits risques</Label>
                  <Textarea value={form.petits_risques} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Grands risques</Label>
                  <Textarea value={form.grands_risques} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Limite géographique</Label>
                  <Input value={form.limite_geographique} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Plafonds familiale</Label>
                  <Input value={form.plafonds_familiale} readOnly />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Confirmation de prise en charge</Label>
                  <Input value={form.confirmation_de_prise_en_charge ? 'Oui' : 'Non'} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Confirmation de plafond</Label>
                  <Input value={form.confirmation_de_plafond ? 'Oui' : 'Non'} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Accord avec le groupement</Label>
                  <Input value={form.accord_avec_le_groupement ? 'Oui' : 'Non'} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Validation finale</Label>
                  <Input value={form.validation_finale ? 'Oui' : 'Non'} readOnly />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Délais de carence</Label>
                  <Input value={form.delais_de_carence} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Délais de carence (Accident)</Label>
                  <Input value={form.delais_de_carence_accident} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Maladie exclue</Label>
                  <Input value={form.maladie_exclus} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Questionnaire médical</Label>
                  <Input value={form.questionnaire_medical} readOnly />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Refus / Acceptation</Label>
                  <Input value={form.refus_acceptation} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Décision</Label>
                  <Input value={form.decision} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Prime</Label>
                  <Input
                    type="number"
                    value={primeValue}
                    onChange={(e) => setPrimeValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom du prospect</Label>
                  <Input value={form.nom_du_prospect} readOnly />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date de couverture</Label>
                  <Input value={form.date_de_couverture} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Date échéance</Label>
                  <Input value={form.date_echance} readOnly />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Attestation d&apos;information</Label>
                  <Textarea value={form.attestation_information} readOnly />
                </div>
              </div>

              <div className="flex justify-end gap-2 print:hidden">
                <Button onClick={handleSavePrime} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer la prime'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  )
}
