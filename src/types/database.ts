// Supabase-Datenbanktypen für das Estera CRM.
//
// Abgeleitet aus supabase/migrations/0001_schema.sql (im Table Editor
// verifiziert: 5 Tabellen, 9 Enums, 15 Pipeline-Phasen). Manuell erzeugt,
// weil `supabase gen types` in dieser Umgebung Docker voraussetzt, das hier
// nicht verfügbar ist. Bei Schemaänderungen neu generieren bzw. anpassen
// (mit Docker/CLI: `supabase gen types typescript --db-url … > …`).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      notifications: {
        Row: {
          id: string;
          empfaenger_id: string;
          typ: string;
          titel: string;
          text: string | null;
          link: string | null;
          gelesen: boolean;
          erzeugt_von: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empfaenger_id: string;
          typ?: string;
          titel: string;
          text?: string | null;
          link?: string | null;
          gelesen?: boolean;
          erzeugt_von?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          empfaenger_id?: string;
          typ?: string;
          titel?: string;
          text?: string | null;
          link?: string | null;
          gelesen?: boolean;
          erzeugt_von?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          vorname: string;
          nachname: string;
          rolle: Database["public"]["Enums"]["rolle_enum"];
          bereich: Database["public"]["Enums"]["bereich_enum"][];
          aktiv: boolean;
          vertriebler_stufe: number | null;
          immo_anteil_default: number | null;
          parent_berater_id: string | null;
          karriere_fenster_start: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          vorname: string;
          nachname: string;
          rolle?: Database["public"]["Enums"]["rolle_enum"];
          bereich?: Database["public"]["Enums"]["bereich_enum"][];
          aktiv?: boolean;
          vertriebler_stufe?: number | null;
          immo_anteil_default?: number | null;
          parent_berater_id?: string | null;
          karriere_fenster_start?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vorname?: string;
          nachname?: string;
          rolle?: Database["public"]["Enums"]["rolle_enum"];
          bereich?: Database["public"]["Enums"]["bereich_enum"][];
          aktiv?: boolean;
          vertriebler_stufe?: number | null;
          immo_anteil_default?: number | null;
          parent_berater_id?: string | null;
          karriere_fenster_start?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pipeline_stages: {
        Row: {
          id: string;
          bereich: Database["public"]["Enums"]["bereich_enum"];
          name: string;
          position: number;
          wahrscheinlichkeit: number;
          sla_tage: number | null;
          is_won: boolean;
          is_lost: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          bereich: Database["public"]["Enums"]["bereich_enum"];
          name: string;
          position: number;
          wahrscheinlichkeit: number;
          sla_tage?: number | null;
          is_won?: boolean;
          is_lost?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          bereich?: Database["public"]["Enums"]["bereich_enum"];
          name?: string;
          position?: number;
          wahrscheinlichkeit?: number;
          sla_tage?: number | null;
          is_won?: boolean;
          is_lost?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          vorname: string;
          nachname: string;
          email: string | null;
          telefon: string | null;
          berater_id: string;
          status: Database["public"]["Enums"]["kontakt_status_enum"];
          termin_status: Database["public"]["Enums"]["termin_status_enum"];
          leadquelle: Database["public"]["Enums"]["leadquelle_enum"] | null;
          interesse: Database["public"]["Enums"]["bereich_enum"][];
          nettoverdienst_monatlich: number | null;
          eigenkapital: number | null;
          finanzierungsrahmen: Database["public"]["Enums"]["finanzierungsrahmen_enum"] | null;
          finanzierungsrahmen_betrag: number | null;
          einschaetzung_erhalten: boolean;
          datum_einschaetzung: string | null;
          eingeschaetzter_betrag: number | null;
          einschaetzung_durch: string | null;
          einschaetzung_status: Database["public"]["Enums"]["einschaetzung_status_enum"] | null;
          unterlagen_vollstaendig: boolean;
          fehlende_unterlagen: string | null;
          finanzierungsstatus: Database["public"]["Enums"]["finanzierungsstatus_enum"];
          ist_selbststaendig: boolean;
          ist_immobilienbesitzer: boolean;
          ist_bestandskunde: boolean;
          einschaetzung: string;
          belegt_deal_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vorname: string;
          nachname: string;
          email?: string | null;
          telefon?: string | null;
          berater_id: string;
          status?: Database["public"]["Enums"]["kontakt_status_enum"];
          termin_status?: Database["public"]["Enums"]["termin_status_enum"];
          leadquelle?: Database["public"]["Enums"]["leadquelle_enum"] | null;
          interesse?: Database["public"]["Enums"]["bereich_enum"][];
          nettoverdienst_monatlich?: number | null;
          eigenkapital?: number | null;
          finanzierungsrahmen?: Database["public"]["Enums"]["finanzierungsrahmen_enum"] | null;
          finanzierungsrahmen_betrag?: number | null;
          einschaetzung_erhalten?: boolean;
          datum_einschaetzung?: string | null;
          eingeschaetzter_betrag?: number | null;
          einschaetzung_durch?: string | null;
          einschaetzung_status?: Database["public"]["Enums"]["einschaetzung_status_enum"] | null;
          unterlagen_vollstaendig?: boolean;
          fehlende_unterlagen?: string | null;
          finanzierungsstatus?: Database["public"]["Enums"]["finanzierungsstatus_enum"];
          ist_selbststaendig?: boolean;
          ist_immobilienbesitzer?: boolean;
          ist_bestandskunde?: boolean;
          einschaetzung?: string;
          belegt_deal_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vorname?: string;
          nachname?: string;
          email?: string | null;
          telefon?: string | null;
          berater_id?: string;
          status?: Database["public"]["Enums"]["kontakt_status_enum"];
          termin_status?: Database["public"]["Enums"]["termin_status_enum"];
          leadquelle?: Database["public"]["Enums"]["leadquelle_enum"] | null;
          interesse?: Database["public"]["Enums"]["bereich_enum"][];
          nettoverdienst_monatlich?: number | null;
          eigenkapital?: number | null;
          finanzierungsrahmen?: Database["public"]["Enums"]["finanzierungsrahmen_enum"] | null;
          finanzierungsrahmen_betrag?: number | null;
          einschaetzung_erhalten?: boolean;
          datum_einschaetzung?: string | null;
          eingeschaetzter_betrag?: number | null;
          einschaetzung_durch?: string | null;
          einschaetzung_status?: Database["public"]["Enums"]["einschaetzung_status_enum"] | null;
          unterlagen_vollstaendig?: boolean;
          fehlende_unterlagen?: string | null;
          finanzierungsstatus?: Database["public"]["Enums"]["finanzierungsstatus_enum"];
          ist_selbststaendig?: boolean;
          ist_immobilienbesitzer?: boolean;
          ist_bestandskunde?: boolean;
          einschaetzung?: string;
          belegt_deal_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_berater_id_fkey";
            columns: ["berater_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          id: string;
          dealname: string;
          berater_id: string;
          contact_id: string;
          bereich: Database["public"]["Enums"]["bereich_enum"];
          stage_id: string;
          naechster_termin: string | null;
          bemerkungen: string | null;
          kaufpreis: number | null;
          objekt_adresse: string | null;
          objekt_status: Database["public"]["Enums"]["objekt_status_enum"] | null;
          notartermin: string | null;
          bws: number | null;
          sparbeitrag: number | null;
          anzahl_jahre: number | null;
          factoring: boolean;
          vv_zahlart: string | null;
          deal_typ: string | null;
          ratierlich: boolean | null;
          tippgeber: string | null;
          tippgeber_satz: number | null;
          tippgeber_id: string | null;
          provisionssatz: number | null;
          berater_anteil: number | null;
          next_step: string | null;
          next_step_faellig: string | null;
          created_at: string;
          updated_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          dealname: string;
          berater_id: string;
          contact_id: string;
          bereich: Database["public"]["Enums"]["bereich_enum"];
          stage_id: string;
          naechster_termin?: string | null;
          bemerkungen?: string | null;
          kaufpreis?: number | null;
          objekt_adresse?: string | null;
          objekt_status?: Database["public"]["Enums"]["objekt_status_enum"] | null;
          notartermin?: string | null;
          bws?: number | null;
          sparbeitrag?: number | null;
          anzahl_jahre?: number | null;
          factoring?: boolean;
          vv_zahlart?: string | null;
          deal_typ?: string | null;
          ratierlich?: boolean | null;
          tippgeber?: string | null;
          tippgeber_satz?: number | null;
          tippgeber_id?: string | null;
          provisionssatz?: number | null;
          berater_anteil?: number | null;
          next_step?: string | null;
          next_step_faellig?: string | null;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          dealname?: string;
          berater_id?: string;
          contact_id?: string;
          bereich?: Database["public"]["Enums"]["bereich_enum"];
          stage_id?: string;
          naechster_termin?: string | null;
          bemerkungen?: string | null;
          kaufpreis?: number | null;
          objekt_adresse?: string | null;
          objekt_status?: Database["public"]["Enums"]["objekt_status_enum"] | null;
          notartermin?: string | null;
          bws?: number | null;
          sparbeitrag?: number | null;
          anzahl_jahre?: number | null;
          factoring?: boolean;
          vv_zahlart?: string | null;
          deal_typ?: string | null;
          ratierlich?: boolean | null;
          tippgeber?: string | null;
          tippgeber_satz?: number | null;
          tippgeber_id?: string | null;
          provisionssatz?: number | null;
          berater_anteil?: number | null;
          next_step?: string | null;
          next_step_faellig?: string | null;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deals_berater_id_fkey";
            columns: ["berater_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_stage_history: {
        Row: {
          id: string;
          deal_id: string;
          stage_id: string;
          entered_at: string;
          left_at: string | null;
          changed_by: string | null;
        };
        Insert: {
          id?: string;
          deal_id: string;
          stage_id: string;
          entered_at?: string;
          left_at?: string | null;
          changed_by?: string | null;
        };
        Update: {
          id?: string;
          deal_id?: string;
          stage_id?: string;
          entered_at?: string;
          left_at?: string | null;
          changed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_stage_history_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_stage_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_documents: {
        Row: {
          id: string;
          contact_id: string;
          dateiname: string;
          storage_path: string;
          kategorie: string;
          document_type_id: string | null;
          groesse: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          dateiname: string;
          storage_path: string;
          kategorie?: string;
          document_type_id?: string | null;
          groesse?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          dateiname?: string;
          storage_path?: string;
          kategorie?: string;
          document_type_id?: string | null;
          groesse?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_documents_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_documents: {
        Row: {
          id: string;
          titel: string;
          dateiname: string;
          storage_path: string;
          sichtbarkeit: "vorlage" | "intern";
          bereich: Database["public"]["Enums"]["bereich_enum"] | null;
          groesse: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          titel: string;
          dateiname: string;
          storage_path: string;
          sichtbarkeit?: "vorlage" | "intern";
          bereich?: Database["public"]["Enums"]["bereich_enum"] | null;
          groesse?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          titel?: string;
          dateiname?: string;
          storage_path?: string;
          sichtbarkeit?: "vorlage" | "intern";
          bereich?: Database["public"]["Enums"]["bereich_enum"] | null;
          groesse?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      document_types: {
        Row: {
          id: string;
          gruppe: Database["public"]["Enums"]["dokument_gruppe_enum"];
          name: string;
          position: number;
          aktiv: boolean;
        };
        Insert: {
          id?: string;
          gruppe: Database["public"]["Enums"]["dokument_gruppe_enum"];
          name: string;
          position: number;
          aktiv?: boolean;
        };
        Update: {
          id?: string;
          gruppe?: Database["public"]["Enums"]["dokument_gruppe_enum"];
          name?: string;
          position?: number;
          aktiv?: boolean;
        };
        Relationships: [];
      };
      contact_document_status: {
        Row: {
          contact_id: string;
          document_type_id: string;
          vorhanden: boolean;
          document_id: string | null;
          updated_at: string;
        };
        Insert: {
          contact_id: string;
          document_type_id: string;
          vorhanden?: boolean;
          document_id?: string | null;
          updated_at?: string;
        };
        Update: {
          contact_id?: string;
          document_type_id?: string;
          vorhanden?: boolean;
          document_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_activities: {
        Row: {
          id: string;
          contact_id: string;
          typ: Database["public"]["Enums"]["activity_typ_enum"];
          text: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          typ?: Database["public"]["Enums"]["activity_typ_enum"];
          text: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          typ?: Database["public"]["Enums"]["activity_typ_enum"];
          text?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          titel: string;
          faellig_am: string | null;
          erledigt: boolean;
          contact_id: string | null;
          deal_id: string | null;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          titel: string;
          faellig_am?: string | null;
          erledigt?: boolean;
          contact_id?: string | null;
          deal_id?: string | null;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          titel?: string;
          faellig_am?: string | null;
          erledigt?: boolean;
          contact_id?: string | null;
          deal_id?: string | null;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      berater_monatsziele: {
        Row: {
          berater_id: string;
          monatsziel_immobilien: number | null;
          monatsziel_vv: number | null;
          gesperrt: boolean;
          updated_at: string;
        };
        Insert: {
          berater_id: string;
          monatsziel_immobilien?: number | null;
          monatsziel_vv?: number | null;
          gesperrt?: boolean;
          updated_at?: string;
        };
        Update: {
          berater_id?: string;
          monatsziel_immobilien?: number | null;
          monatsziel_vv?: number | null;
          gesperrt?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      crm_einstellungen: {
        Row: { key: string; value: string; updated_at: string };
        Insert: { key: string; value: string; updated_at?: string };
        Update: { key?: string; value?: string; updated_at?: string };
        Relationships: [];
      };
      tippgeber: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          provision_satz: number | null;
          bereiche: Database["public"]["Enums"]["bereich_enum"][];
          aktiv: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          provision_satz?: number | null;
          bereiche?: Database["public"]["Enums"]["bereich_enum"][];
          aktiv?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          provision_satz?: number | null;
          bereiche?: Database["public"]["Enums"]["bereich_enum"][];
          aktiv?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      set_vertriebler_stufe: {
        Args: { target: string; stufe: number };
        Returns: undefined;
      };
      set_berater_bereiche: {
        Args: {
          target: string;
          neue_bereiche: Database["public"]["Enums"]["bereich_enum"][];
        };
        Returns: undefined;
      };
      set_berater_anbindung: {
        Args: {
          target: string;
          p_immo_default: number | null;
          p_parent: string | null;
        };
        Returns: undefined;
      };
      set_monatsziel_fuer: {
        Args: {
          p_target: string;
          p_immo: number | null;
          p_vv: number | null;
        };
        Returns: undefined;
      };
      set_monatsziel_sperre: {
        Args: { target: string; p_gesperrt: boolean };
        Returns: undefined;
      };
      is_backoffice: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      set_immo_provision_modus: {
        Args: { p_modus: string };
        Returns: undefined;
      };
    };
    Enums: {
      rolle_enum: "berater" | "geschaeftsfuehrung" | "backoffice";
      bereich_enum: "immobilien" | "vv";
      finanzierungsstatus_enum: "offen" | "in_pruefung" | "zugesagt";
      dokument_gruppe_enum: "allgemein" | "selbststaendig" | "immobilienbesitzer";
      activity_typ_enum: "anruf" | "mail" | "whatsapp" | "notiz" | "system";
      kontakt_status_enum:
        | "Neu"
        | "In Bearbeitung"
        | "Qualifiziert"
        | "Nicht erreicht"
        | "Kalt";
      termin_status_enum: "Nicht vereinbart" | "Vereinbart" | "Durchgeführt";
      leadquelle_enum:
        | "TikTok"
        | "Instagram"
        | "Facebook"
        | "Empfehlung"
        | "Kooperationen"
        | "Webseite"
        | "Sonstige";
      finanzierungsrahmen_enum:
        | "Bis 250k"
        | "250-350k"
        | "350-500k"
        | "500-700k"
        | "700k+";
      einschaetzung_status_enum:
        | "Ausstehend"
        | "Positiv"
        | "Bedingt positiv"
        | "Abgelehnt";
      objekt_status_enum: "Verfügbar" | "Reserviert" | "Verkauft";
      berechnungsart_enum: "mit Factoring" | "ohne Factoring" | "alter Provsatz";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ── Komfort-Helfer (wie von supabase gen types üblich) ───────────────────
type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      rolle_enum: ["berater", "geschaeftsfuehrung", "backoffice"],
      bereich_enum: ["immobilien", "vv"],
      kontakt_status_enum: [
        "Neu",
        "In Bearbeitung",
        "Qualifiziert",
        "Nicht erreicht",
        "Kalt",
      ],
      termin_status_enum: ["Nicht vereinbart", "Vereinbart", "Durchgeführt"],
      leadquelle_enum: [
        "TikTok",
        "Instagram",
        "Facebook",
        "Empfehlung",
        "Kooperationen",
        "Webseite",
        "Sonstige",
      ],
      finanzierungsrahmen_enum: [
        "Bis 250k",
        "250-350k",
        "350-500k",
        "500-700k",
        "700k+",
      ],
      einschaetzung_status_enum: [
        "Ausstehend",
        "Positiv",
        "Bedingt positiv",
        "Abgelehnt",
      ],
      objekt_status_enum: ["Verfügbar", "Reserviert", "Verkauft"],
      berechnungsart_enum: ["mit Factoring", "ohne Factoring", "alter Provsatz"],
    },
  },
} as const;
