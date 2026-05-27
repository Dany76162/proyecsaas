"use client";

import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Download,
  AlertOctagon,
  Info,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  FileText,
  Play,
  CheckSquare,
  RefreshCw,
  ShieldCheck,
  Activity,
  Database,
  UserCheck,
  Eye
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { initializeProductionSandboxAction } from "./actions";

// Dynamic types for localStorage state persistence
type StatusType = "PENDIENTE" | "PASS" | "FAIL" | "WARNING";

interface ChecklistItem {
  id: string;
  label: string;
  status: StatusType;
  observation: string;
}

interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

const INITIAL_SECTIONS: ChecklistSection[] = [
  {
    id: "modelo",
    title: "A) Modelo de Negocio",
    items: [
      { id: "m1", label: "La ruta /platform/business-model carga correctamente en el navegador y es accesible.", status: "PENDIENTE", observation: "" },
      { id: "m2", label: "Sección 'Cupo Fundador' muestra correctamente la etiqueta: 'Primeras 100' y descripción de lanzamiento limitado.", status: "PENDIENTE", observation: "" },
      { id: "m3", label: "Sección 'Expansión 2026-2030' muestra la meta 2026 agresiva de 500 inmobiliarias.", status: "PENDIENTE", observation: "" },
      { id: "m4", label: "Sección 'Expansión 2026-2030' muestra la meta corporativa LATAM 2030 de 10.000 inmobiliarias/usuarios.", status: "PENDIENTE", observation: "" },
      { id: "m5", label: "El botón 'Exportar Markdown' del Modelo de Negocio descarga un archivo .md con los valores vigentes correctos.", status: "PENDIENTE", observation: "" }
    ]
  },
  {
    id: "org",
    title: "B) Organización QA",
    items: [
      { id: "o1", label: "Existe la organización sandbox 'RaicesPilot QA Test' y se valida a través de su slug: 'raicespilot-qa-test'.", status: "PENDIENTE", observation: "" },
      { id: "o2", label: "La organización posee configurado el plan 'FOUNDER' (o equivalente a la oferta de lanzamiento).", status: "PENDIENTE", observation: "" },
      { id: "o3", label: "Monto del ciclo de suscripción configurado en $65.000 + impuestos.", status: "PENDIENTE", observation: "" },
      { id: "o4", label: "El estado de la Inteligencia Artificial (aiStatus) de la organización sandbox figura como 'ACTIVE'.", status: "PENDIENTE", observation: "" },
      { id: "o5", label: "El límite mensual de conversaciones y el indicador de consumo acumulado son visibles en la interfaz de control.", status: "PENDIENTE", observation: "" },
      { id: "o6", label: "El indicador de fecha del próximo reset mensual de consumo es visible en pantalla.", status: "PENDIENTE", observation: "" }
    ]
  },
  {
    id: "comercial",
    title: "C) Control Comercial",
    items: [
      { id: "c1", label: "Registrar un pago suma un ciclo de pago a los acumulados (ej. incrementa 1/12).", status: "PENDIENTE", observation: "" },
      { id: "c2", label: "El sistema bloquea registros de pagos adicionales una vez alcanzado el límite total de 12/12 ciclos.", status: "PENDIENTE", observation: "" },
      { id: "c3", label: "La condición de 'Lifetime' (Licencia de por vida) se activa/concede de manera correspondiente una vez completados los 12 ciclos.", status: "PENDIENTE", observation: "" },
      { id: "c4", label: "Conceder la condición de Lifetime a la organización mantiene el CRM base activo y accesible.", status: "PENDIENTE", observation: "" }
    ]
  },
  {
    id: "consumo",
    title: "D) Consumo e IA",
    items: [
      { id: "i1", label: "El primer lead captado/mensaje generado por IA suma exactamente 1 conversación en el contador mensual.", status: "PENDIENTE", observation: "" },
      { id: "i2", label: "Mensajes consecutivos o adicionales dentro del mismo hilo del lead en el ciclo actual no duplican/suman al contador.", status: "PENDIENTE", observation: "" },
      { id: "i3", label: "Un lead completamente nuevo o diferente suma una conversación adicional al contador mensual.", status: "PENDIENTE", observation: "" },
      { id: "i4", label: "Al alcanzar el límite mensual de conversaciones configurado, el estado de la IA de la organización pasa automáticamente a 'PAUSED'.", status: "PENDIENTE", observation: "" },
      { id: "i5", label: "Con la IA en estado PAUSED/limite superado, el CRM, el catálogo de propiedades, el panel y los tours 360 siguen completamente activos y accesibles.", status: "PENDIENTE", observation: "" }
    ]
  },
  {
    id: "alertas",
    title: "E) Alertas y Logs",
    items: [
      { id: "a1", label: "Se activa la alerta visual y notificación cuando el consumo mensual está cerca del límite establecido.", status: "PENDIENTE", observation: "" },
      { id: "a2", label: "Se activa la alerta visual en el panel cuando el consumo mensual ha alcanzado el límite exacto.", status: "PENDIENTE", observation: "" },
      { id: "a3", label: "Se renderiza de forma clara la alerta informando que la Inteligencia Artificial se encuentra pausada temporalmente.", status: "PENDIENTE", observation: "" },
      { id: "a4", label: "Los logs estructurados JSON son correctamente generados y visibles en Railway o consola de desarrollo sin errores de runtime.", status: "PENDIENTE", observation: "" }
    ]
  }
];

const INITIAL_PRELOAD_SECTIONS: ChecklistSection[] = [
  {
    id: "modelo",
    title: "A) Modelo de Negocio",
    items: [
      { id: "m1", label: "La ruta /platform/business-model carga correctamente en el navegador y es accesible.", status: "PASS", observation: "La ruta /platform/business-model carga correctamente en producción y es accesible desde el Superadmin." },
      { id: "m2", label: "Sección 'Cupo Fundador' muestra correctamente la etiqueta: 'Primeras 100' y descripción de lanzamiento limitado.", status: "PASS", observation: "La sección Cupo Fundador muestra correctamente “Primeras 100” y se entiende como beneficio limitado de lanzamiento." },
      { id: "m3", label: "Sección 'Expansión 2026-2030' muestra la meta 2026 agresiva de 500 inmobiliarias.", status: "PASS", observation: "La sección Expansión 2026–2030 muestra la meta agresiva 2026 de 500 inmobiliarias." },
      { id: "m4", label: "Sección 'Expansión 2026-2030' muestra la meta corporativa LATAM 2030 de 10.000 inmobiliarias/usuarios.", status: "PASS", observation: "La sección Expansión 2026–2030 muestra la visión LATAM 2030 de 10.000 inmobiliarias/usuarios." },
      { id: "m5", label: "El botón 'Exportar Markdown' del Modelo de Negocio descarga un archivo .md con los valores vigentes correctos.", status: "PASS", observation: "El botón Exportar Markdown del Modelo de Negocio descarga correctamente el archivo .md con los valores vigentes." }
    ]
  },
  {
    id: "org",
    title: "B) Organización QA",
    items: [
      { id: "o1", label: "Existe la organización sandbox 'RaicesPilot QA Test' y se valida a través de su slug: 'raicespilot-qa-test'.", status: "WARNING", observation: "Pendiente confirmar existencia real de la organización sandbox raicespilot-qa-test en Clientes/Organizaciones." },
      { id: "o2", label: "La organización posee configurado el plan 'FOUNDER' (o equivalente a la oferta de lanzamiento).", status: "WARNING", observation: "Pendiente configurar o verificar plan FOUNDER en la organización QA." },
      { id: "o3", label: "Monto del ciclo de suscripción configurado en $65.000 + impuestos.", status: "WARNING", observation: "Pendiente verificar monto $65.000 + impuestos en la organización QA." },
      { id: "o4", label: "El estado de la Inteligencia Artificial (aiStatus) de la organización sandbox figura como 'ACTIVE'.", status: "WARNING", observation: "Pendiente verificar que aiStatus figure como ACTIVE en la organización QA." },
      { id: "o5", label: "El límite mensual de conversaciones y el indicador de consumo acumulado son visibles en la interfaz de control.", status: "WARNING", observation: "Pendiente verificar límite mensual y contador de conversaciones en la ficha comercial." },
      { id: "o6", label: "El indicador de fecha del próximo reset mensual de consumo es visible en pantalla.", status: "WARNING", observation: "Pendiente verificar fecha del próximo reset mensual." }
    ]
  },
  {
    id: "comercial",
    title: "C) Control Comercial",
    items: [
      { id: "c1", label: "Registrar un pago suma un ciclo de pago a los acumulados (ej. incrementa 1/12).", status: "PENDIENTE", observation: "Pendiente probar registro de pago sobre organización QA." },
      { id: "c2", label: "El sistema bloquea registros de pagos adicionales una vez alcanzado el límite total de 12/12 ciclos.", status: "PENDIENTE", observation: "Pendiente validar bloqueo al superar 12/12 pagos." },
      { id: "c3", label: "La condición de 'Lifetime' (Licencia de por vida) se activa/concede de manera correspondiente una vez completados los 12 ciclos.", status: "PENDIENTE", observation: "Pendiente validar aparición/activación de Lifetime." },
      { id: "c4", label: "Conceder la condición de Lifetime a la organización mantiene el CRM base activo y accesible.", status: "PENDIENTE", observation: "Pendiente confirmar que Lifetime mantiene CRM base activo." }
    ]
  },
  {
    id: "consumo",
    title: "D) Consumo e IA",
    items: [
      { id: "i1", label: "El primer lead captado/mensaje generado por IA suma exactamente 1 conversación en el contador mensual.", status: "PENDIENTE", observation: "Pendiente enviar primer mensaje/lead de prueba y confirmar incremento del contador." },
      { id: "i2", label: "Mensajes consecutivos o adicionales dentro del mismo hilo del lead en el ciclo actual no duplican/suman al contador.", status: "PENDIENTE", observation: "Pendiente validar que el mismo lead no duplique consumo." },
      { id: "i3", label: "Un lead completamente nuevo o diferente suma una conversación adicional al contador mensual.", status: "PENDIENTE", observation: "Pendiente validar que un lead nuevo suma una conversación adicional." },
      { id: "i4", label: "Al alcanzar el límite mensual de conversaciones configurado, el estado de la IA de la organización pasa automáticamente a 'PAUSED'.", status: "PENDIENTE", observation: "Pendiente validar pausa automática al alcanzar límite mensual." },
      { id: "i5", label: "Con la IA en estado PAUSED/limite superado, el CRM, el catálogo de propiedades, el panel y los tours 360 siguen completamente activos y accesibles.", status: "PENDIENTE", observation: "Pendiente confirmar CRM/catálogo/tours activos con IA pausada." }
    ]
  },
  {
    id: "alertas",
    title: "E) Alertas y Logs",
    items: [
      { id: "a1", label: "Se activa la alerta visual y notificación cuando el consumo mensual está cerca del límite establecido.", status: "PENDIENTE", observation: "Pendiente simular consumo cercano al límite." },
      { id: "a2", label: "Se activa la alerta visual en el panel cuando el consumo mensual ha alcanzado el límite exacto.", status: "PENDIENTE", observation: "Pendiente simular consumo igual al límite mensual." },
      { id: "a3", label: "Se renderiza de forma clara la alerta informando que la Inteligencia Artificial se encuentra pausada temporalmente.", status: "PENDIENTE", observation: "Pendiente confirmar alerta visual de IA pausada." },
      { id: "a4", label: "Los logs estructurados JSON son correctamente generados y visibles en Railway o consola de desarrollo sin errores de runtime.", status: "PENDIENTE", observation: "Pendiente revisar logs JSON en Railway." }
    ]
  }
];

const ORGANIZACION_VALIDADA_SECTIONS: ChecklistSection[] = [
  {
    id: "modelo",
    title: "A) Modelo de Negocio",
    items: [
      { id: "m1", label: "La ruta /platform/business-model carga correctamente en el navegador y es accesible.", status: "PASS", observation: "La ruta /platform/business-model carga correctamente en producción y es accesible desde el Superadmin." },
      { id: "m2", label: "Sección 'Cupo Fundador' muestra correctamente la etiqueta: 'Primeras 100' y descripción de lanzamiento limitado.", status: "PASS", observation: "La sección Cupo Fundador muestra correctamente “Primeras 100” y se entiende como beneficio limitado de lanzamiento." },
      { id: "m3", label: "Sección 'Expansión 2026-2030' muestra la meta 2026 agresiva de 500 inmobiliarias.", status: "PASS", observation: "La sección Expansión 2026–2030 muestra la meta agresiva 2026 de 500 inmobiliarias." },
      { id: "m4", label: "Sección 'Expansión 2026-2030' muestra la meta corporativa LATAM 2030 de 10.000 inmobiliarias/usuarios.", status: "PASS", observation: "La sección Expansión 2026–2030 muestra la visión LATAM 2030 de 10.000 inmobiliarias/usuarios." },
      { id: "m5", label: "El botón 'Exportar Markdown' del Modelo de Negocio descarga un archivo .md con los valores vigentes correctos.", status: "PASS", observation: "El botón Exportar Markdown del Modelo de Negocio descarga correctamente el archivo .md con los valores vigentes." }
    ]
  },
  {
    id: "org",
    title: "B) Organización QA",
    items: [
      { id: "o1", label: "Existe la organización sandbox 'RaicesPilot QA Test' y se valida a través de su slug: 'raicespilot-qa-test'.", status: "PASS", observation: "Organización sandbox creada correctamente. orgId: cmpo8xub70000vd980oa2g23h. Slug: raicespilot-qa-test." },
      { id: "o2", label: "La organización posee configurado el plan 'FOUNDER' (o equivalente a la oferta de lanzamiento).", status: "PASS", observation: "La organización posee planCode FOUNDER." },
      { id: "o3", label: "Monto del ciclo de suscripción configurado en $65.000 + impuestos.", status: "PASS", observation: "Monto visible configurado en planLabel: $65.000 + impuestos." },
      { id: "o4", label: "El estado de la Inteligencia Artificial (aiStatus) de la organización sandbox figura como 'ACTIVE'.", status: "PASS", observation: "aiStatus configurado como ACTIVE." },
      { id: "o5", label: "El límite mensual de conversaciones y el indicador de consumo acumulado son visibles en la interfaz de control.", status: "PASS", observation: "Límite mensual configurado en 300 conversaciones y consumo actual en 0." },
      { id: "o6", label: "El indicador de fecha del próximo reset mensual de consumo es visible en pantalla.", status: "PASS", observation: "Próximo reset mensual configurado para 2026-06-26." }
    ]
  },
  {
    id: "comercial",
    title: "C) Control Comercial",
    items: [
      { id: "c1", label: "Registrar un pago suma un ciclo de pago a los acumulados (ej. incrementa 1/12).", status: "PENDIENTE", observation: "Pendiente probar registro de pago sobre organización QA." },
      { id: "c2", label: "El sistema bloquea registros de pagos adicionales una vez alcanzado el límite total de 12/12 ciclos.", status: "PENDIENTE", observation: "Pendiente validar bloqueo al superar 12/12 pagos." },
      { id: "c3", label: "La condición de 'Lifetime' (Licencia de por vida) se activa/concede de manera correspondiente una vez completados los 12 ciclos.", status: "PENDIENTE", observation: "Pendiente validar aparición/activación de Lifetime." },
      { id: "c4", label: "Conceder la condición de Lifetime a la organización mantiene el CRM base activo y accesible.", status: "PENDIENTE", observation: "Pendiente confirmar que Lifetime mantiene CRM base activo." }
    ]
  },
  {
    id: "consumo",
    title: "D) Consumo e IA",
    items: [
      { id: "i1", label: "El primer lead captado/mensaje generado por IA suma exactamente 1 conversación en el contador mensual.", status: "PENDIENTE", observation: "Pendiente enviar primer mensaje/lead de prueba y confirmar incremento del contador." },
      { id: "i2", label: "Mensajes consecutivos o adicionales dentro del mismo hilo del lead en el ciclo actual no duplican/suman al contador.", status: "PENDIENTE", observation: "Pendiente validar que el mismo lead no duplique consumo." },
      { id: "i3", label: "Un lead completamente nuevo o diferente suma una conversación adicional al contador mensual.", status: "PENDIENTE", observation: "Pendiente validar que un lead nuevo suma una conversación adicional." },
      { id: "i4", label: "Al alcanzar el límite mensual de conversaciones configurado, el estado de la IA de la organización pasa automáticamente a 'PAUSED'.", status: "PENDIENTE", observation: "Pendiente validar pausa automática al alcanzar límite mensual." },
      { id: "i5", label: "Con la IA en estado PAUSED/limite superado, el CRM, el catálogo de propiedades, el panel y los tours 360 siguen completamente activos y accesibles.", status: "PENDIENTE", observation: "Pendiente confirmar CRM/catálogo/tours activos con IA pausada." }
    ]
  },
  {
    id: "alertas",
    title: "E) Alertas y Logs",
    items: [
      { id: "a1", label: "Se activa la alerta visual y notificación cuando el consumo mensual está cerca del límite establecido.", status: "PENDIENTE", observation: "Pendiente simular consumo cercano al límite." },
      { id: "a2", label: "Se activa la alerta visual en el panel cuando el consumo mensual ha alcanzado el límite exacto.", status: "PENDIENTE", observation: "Pendiente simular consumo igual al límite mensual." },
      { id: "a3", label: "Se renderiza de forma clara la alerta informando que la Inteligencia Artificial se encuentra pausada temporalmente.", status: "PENDIENTE", observation: "Pendiente confirmar alerta visual de IA pausada." },
      { id: "a4", label: "Los logs estructurados JSON son correctamente generados y visibles en Railway o consola de desarrollo sin errores de runtime.", status: "PENDIENTE", observation: "Pendiente revisar logs JSON en Railway." }
    ]
  }
];

const INITIAL_NOTES_PRELOAD = "La sección Modelo de Negocio fue validada correctamente en producción. Queda pendiente confirmar o crear la organización sandbox `raicespilot-qa-test` para validar el flujo comercial, conteo real de conversaciones IA, pausa automática por límite, CRM activo con IA pausada y logs estructurados.";

const ORGANIZACION_VALIDADA_NOTES = "Modelo de Negocio y Organización QA validados correctamente en producción. La organización sandbox raicespilot-qa-test fue creada con plan FOUNDER, monto $65.000 + impuestos, 1/12 pagos, IA ACTIVE, 0/300 conversaciones y próximo reset el 2026-06-26. Quedan pendientes las pruebas C, D y E: control comercial, consumo real de IA, pausa automática por límite, CRM activo con IA pausada, alertas y logs.";

export default function QAOperativoPage() {
  const [commitHash, setCommitHash] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [finalDecision, setFinalDecision] = useState("Pendiente");
  const [sections, setSections] = useState<ChecklistSection[]>(INITIAL_SECTIONS);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    modelo: true,
    org: true,
    comercial: true,
    consumo: true,
    alertas: true
  });

  // Diagnostic states
  const [loadingDiag, setLoadingDiag] = useState(true);
  const [diagData, setDiagData] = useState<any>(null);
  const [initializing, setInitializing] = useState(false);
  const [initResult, setInitResult] = useState<any>(null);

  // Load from localStorage on mount & run active server diagnostic
  useEffect(() => {
    try {
      const storedCommit = localStorage.getItem("qa_commit");
      const storedNotes = localStorage.getItem("qa_notes");
      const storedDecision = localStorage.getItem("qa_decision");
      const storedSections = localStorage.getItem("qa_sections");

      if (storedCommit) setCommitHash(storedCommit);
      
      if (storedNotes !== null) {
        setGeneralNotes(storedNotes);
      } else {
        setGeneralNotes(INITIAL_NOTES_PRELOAD);
      }

      if (storedDecision !== null) {
        setFinalDecision(storedDecision);
      } else {
        setFinalDecision("Con observaciones");
      }

      if (storedSections) {
        setSections(JSON.parse(storedSections));
      } else {
        setSections(INITIAL_SECTIONS);
      }
    } catch (e) {
      console.error("Error al cargar estado de QA de localStorage", e);
    }

    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    setLoadingDiag(true);
    try {
      const res = await fetch("/api/platform/diagnose");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDiagData(data);
        }
      }
    } catch (error) {
      console.error("Error running diagnostic:", error);
    } finally {
      setLoadingDiag(false);
    }
  };

  const handleInitializeSandbox = async () => {
    if (!confirm("¿Confirmas la inicialización controlada del Sandbox en producción? Esto creará únicamente los recursos que hagan falta sin alterar ningún dato comercial real.")) {
      return;
    }

    setInitializing(true);
    setInitResult(null);
    try {
      const res = await initializeProductionSandboxAction();
      setInitResult(res);
      if (res.success) {
        // Automatically refresh diagnostic to update UI status
        await runDiagnostic();
        alert("¡Inicialización de Sandbox completada con éxito!");
      } else {
        alert("Error de inicialización: " + res.message);
      }
    } catch (error: any) {
      console.error("Error initializing sandbox:", error);
      setInitResult({
        success: false,
        message: error.message || String(error)
      });
    } finally {
      setInitializing(false);
    }
  };

  // Save changes helper
  const saveState = (updatedSections: ChecklistSection[], commit: string, notes: string, decision: string) => {
    try {
      localStorage.setItem("qa_commit", commit);
      localStorage.setItem("qa_notes", notes);
      localStorage.setItem("qa_decision", decision);
      localStorage.setItem("qa_sections", JSON.stringify(updatedSections));
    } catch (e) {
      console.error("Error al persistir estado de QA", e);
    }
  };

  const handleCommitChange = (val: string) => {
    setCommitHash(val);
    saveState(sections, val, generalNotes, finalDecision);
  };

  const handleNotesChange = (val: string) => {
    setGeneralNotes(val);
    saveState(sections, commitHash, val, finalDecision);
  };

  const handleDecisionChange = (val: string) => {
    setFinalDecision(val);
    saveState(sections, commitHash, generalNotes, val);
  };

  const handleItemStatusChange = (sectionId: string, itemId: string, newStatus: StatusType) => {
    const updated = sections.map((sec) => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          items: sec.items.map((item) => {
            if (item.id === itemId) {
              return { ...item, status: newStatus };
            }
            return item;
          })
        };
      }
      return sec;
    });
    setSections(updated);
    saveState(updated, commitHash, generalNotes, finalDecision);
  };

  const handleItemObservationChange = (sectionId: string, itemId: string, obs: string) => {
    const updated = sections.map((sec) => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          items: sec.items.map((item) => {
            if (item.id === itemId) {
              return { ...item, observation: obs };
            }
            return item;
          })
        };
      }
      return sec;
    });
    setSections(updated);
    saveState(updated, commitHash, generalNotes, finalDecision);
  };

  const handleClearChecklist = () => {
    if (confirm("¿Estás seguro de que deseas limpiar el estado guardado en el navegador de este checklist?")) {
      localStorage.removeItem("qa_commit");
      localStorage.removeItem("qa_notes");
      localStorage.removeItem("qa_decision");
      localStorage.removeItem("qa_sections");
      setCommitHash("");
      setGeneralNotes("");
      setFinalDecision("Pendiente");
      setSections(INITIAL_SECTIONS);
    }
  };

  const handlePrecargarValidacion = () => {
    setCommitHash("");
    setGeneralNotes(INITIAL_NOTES_PRELOAD);
    setFinalDecision("Con observaciones");
    setSections(INITIAL_PRELOAD_SECTIONS);
    saveState(INITIAL_PRELOAD_SECTIONS, "", INITIAL_NOTES_PRELOAD, "Con observaciones");
  };

  const handlePrecargarOrganizacionQA = () => {
    setCommitHash("");
    setGeneralNotes(ORGANIZACION_VALIDADA_NOTES);
    setFinalDecision("Con observaciones");
    setSections(ORGANIZACION_VALIDADA_SECTIONS);
    saveState(ORGANIZACION_VALIDADA_SECTIONS, "", ORGANIZACION_VALIDADA_NOTES, "Con observaciones");
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportMarkdown = () => {
    const dateStr = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
    
    let markdown = `# REPORTE DE QA OPERATIVO - RaicesPilot\n\n`;
    markdown += `**Fecha de Emisión:** ${dateStr} (Hora Argentina)\n`;
    markdown += `**Commit Validado:** \`${commitHash.trim() || "no especificado"}\`\n`;
    markdown += `**Ambiente de Ejecución:** Producción (Railway)\n`;
    markdown += `**Organización Sandbox Autorizada:** RaicesPilot QA Test (\`raicespilot-qa-test\`)\n`;
    markdown += `**Resultado / Decisión Final:** **${finalDecision.toUpperCase()}**\n\n`;
    
    markdown += `## Notas Generales y Observaciones\n`;
    markdown += `${generalNotes || "*Sin notas generales adicionales.*"}\n\n`;
    
    markdown += `## Detalle del Checklist de Pruebas Manuales\n\n`;
    
    sections.forEach((sec) => {
      markdown += `### ${sec.title}\n`;
      sec.items.forEach((item) => {
        let statusBadge = "⚪ PENDIENTE";
        if (item.status === "PASS") statusBadge = "🟢 PASS";
        if (item.status === "FAIL") statusBadge = "🔴 FAIL";
        if (item.status === "WARNING") statusBadge = "🟡 WARNING";
        
        markdown += `- **[${statusBadge}]** ${item.label}\n`;
        if (item.observation.trim()) {
          markdown += `  *Observación:* ${item.observation}\n`;
        }
      });
      markdown += `\n`;
    });
    
    markdown += `---\n*Reporte generado de forma segura mediante la Consola de Asistencia Manual de QA.*`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filenameCommit = commitHash.trim() ? `-${commitHash.trim().slice(0, 7)}` : "";
    a.href = url;
    a.download = `reporte-qa-operativo${filenameCommit}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* SEGURIDAD VISUAL OBLIGATORIA: Banner Rojo Permanente */}
      <div className="bg-red-600 text-white border-2 border-red-800 p-4 rounded-xl shadow-lg flex gap-4 items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
        <AlertOctagon className="w-6 h-6 shrink-0 mt-0.5 animate-pulse text-white" />
        <div className="relative z-10 space-y-1">
          <h2 className="text-sm font-black uppercase tracking-wider">
            BARRERA DE SEGURIDAD EXCLUSIVA
          </h2>
          <p className="text-xs sm:text-sm font-semibold leading-relaxed">
            Esta consola es de asistencia manual. Toda prueba debe realizarse exclusivamente sobre la organización sandbox RaicesPilot QA Test (<strong className="underline">raicespilot-qa-test</strong>). No usar clientes reales.
          </p>
          <div className="pt-1 flex items-center gap-1.5 text-[10px] text-red-100 font-bold">
            <Info className="w-3.5 h-3.5" />
            Este módulo no ejecuta pruebas automáticas. Solo guía la validación manual del operador.
          </div>
        </div>
      </div>

      {/* Header Fuerte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5">
              Superadmin QA
            </Badge>
            <Badge variant="brand" className="text-[10px] uppercase tracking-wider px-2 py-0.5">
              Fase 1: Checklist Manual
            </Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <ClipboardCheck className="h-6 w-6 text-brand-600" />
            Consola QA Operativo
          </h1>
          <p className="text-sm text-slate-550 mt-1">
            Asistencia en validaciones manuales de despliegue, persistencia en almacenamiento local y reportes estructurados.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            onClick={handlePrecargarValidacion}
            className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold shadow-sm"
          >
            <Play className="mr-2 h-4 w-4" />
            Precargar validación inicial
          </Button>
          <Button
            onClick={handlePrecargarOrganizacionQA}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Precargar organización QA validada
          </Button>
          <Button
            onClick={handleClearChecklist}
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold"
          >
            <Trash2 className="mr-2 h-4 w-4 text-slate-505" />
            Limpiar local
          </Button>
          <Button
            onClick={handleExportMarkdown}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Crear reporte (MD)
          </Button>
        </div>
      </div>

      {/* Meta e Info de Organización Sandbox + Diagnóstico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ficha de Organización Sandbox (Estática / Guía) */}
        <Card className="bg-slate-900 border border-slate-800 p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Organización Sandbox</span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">Autorizada</Badge>
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white leading-tight">RaicesPilot QA Test</h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                Slug: <code className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold">raicespilot-qa-test</code>
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/50 space-y-2 text-xs">
              <p className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 shrink-0" />
                ¿Cómo acceder al detalle?
              </p>
              <p className="text-slate-300 leading-relaxed">
                La ruta de detalle utiliza un <code className="text-slate-200 bg-slate-700 px-1 rounded font-mono">orgId</code> (cuid) interno.
              </p>
              <p className="text-slate-300 leading-relaxed font-semibold">
                Busque en la sección <strong className="text-white">Clientes / Inmobiliarias</strong> por el slug <code className="bg-slate-700 text-slate-200 px-1 rounded font-mono">raicespilot-qa-test</code> para entrar de forma segura.
              </p>
            </div>
          </div>
        </Card>

        {/* Ficha Real-time de Diagnóstico y Autoconexión */}
        <Card className="bg-white border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-brand-600 animate-pulse" />
                Diagnóstico Server-Side
              </h3>
              <Button 
                onClick={runDiagnostic} 
                disabled={loadingDiag}
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingDiag ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {loadingDiag ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
                <span className="text-xs font-semibold">Consultando base de datos de producción...</span>
              </div>
            ) : diagData ? (
              <div className="space-y-3 text-xs">
                {/* User Session Info */}
                <div className="flex items-center gap-2 text-slate-655">
                  <UserCheck className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 leading-none">{diagData.diagnostic?.session?.fullName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{diagData.diagnostic?.session?.email}</p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5">
                    <Database className={`w-4 h-4 shrink-0 ${diagData.sandboxStatus?.existsInDB ? "text-emerald-600" : "text-red-500"}`} />
                    <span className="font-medium">Sandbox: {diagData.sandboxStatus?.existsInDB ? "Existe" : "Falta"}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${diagData.sandboxStatus?.hasMembershipWithOwner ? "text-emerald-600" : "text-red-500"}`} />
                    <span className="font-medium">Owner: {diagData.sandboxStatus?.hasMembershipWithOwner ? "Vinculado" : "Falta"}</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5">
                  <Eye className={`w-4 h-4 shrink-0 ${diagData.listQueryResult?.sandboxAppearsInQuery ? "text-emerald-600" : "text-red-500"}`} />
                  <span className="font-medium">Visible en UI Listado: {diagData.listQueryResult?.sandboxAppearsInQuery ? "SÍ" : "NO"}</span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-655">Estado General:</span>
                  <Badge 
                    variant={diagData.generalState === "OK" ? "success" : "danger"} 
                    className="font-extrabold uppercase tracking-widest text-[9px]"
                  >
                    {diagData.generalState}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-500">Error al cargar diagnóstico. Intenta refrescar.</p>
            )}
          </div>

          {/* Secure POST initialization button */}
          {diagData && diagData.generalState !== "OK" && (
            <div className="pt-4 border-t border-slate-100 mt-4">
              <Button
                onClick={handleInitializeSandbox}
                disabled={initializing}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs py-2 h-auto shadow-md"
              >
                {initializing ? (
                  <>
                    <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Inicializando...
                  </>
                ) : (
                  "Inicializar Sandbox de Producción (POST)"
                )}
              </Button>
              <p className="text-[10px] text-center text-slate-400 mt-1.5 leading-tight font-semibold">
                Herramienta de Superadmin. Creará los registros requeridos de forma idempotente.
              </p>
            </div>
          )}
        </Card>

        {/* Datos Operativos / Commit / Notas */}
        <Card className="bg-white border border-slate-200/60 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Información del Ciclo</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-655 uppercase mb-1">Commit Validado (Hash)</label>
              <input
                type="text"
                value={commitHash}
                onChange={(e) => handleCommitChange(e.target.value)}
                placeholder="Ej: b7ca4ce"
                className="w-full text-sm px-3.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 placeholder-slate-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-655 uppercase mb-1">Resultado / Decisión Final del QA</label>
              <select
                value={finalDecision}
                onChange={(e) => handleDecisionChange(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-bold"
              >
                <option value="Pendiente">⚪ Pendiente</option>
                <option value="Aprobado">🟢 Aprobado</option>
                <option value="Con observaciones">🟡 Con observaciones</option>
                <option value="Rechazado">🔴 Rechazado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-655 uppercase mb-1">Notas Generales de la Prueba</label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Describa el comportamiento general..."
              className="w-full text-sm px-3.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 placeholder-slate-400 text-xs"
            />
          </div>
        </Card>
      </div>

      {/* Checklist Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id} className="bg-white border border-slate-200/60 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition border-b border-slate-200/60"
            >
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-brand-600" />
                {section.title}
              </h2>
              <div className="flex items-center gap-3">
                <div className="text-xs font-bold text-slate-500">
                  {section.items.filter((i) => i.status !== "PENDIENTE").length} / {section.items.length} Completados
                </div>
                {expandedSections[section.id] ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {expandedSections[section.id] && (
              <div className="divide-y divide-slate-100">
                {section.items.map((item) => (
                  <div key={item.id} className="p-6 flex flex-col md:flex-row gap-5 items-start justify-between">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                        {item.label}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          ID: {item.id}
                        </span>
                        {item.status !== "PENDIENTE" && (
                          <Badge
                            variant={
                              item.status === "PASS"
                                ? "success"
                                : item.status === "FAIL"
                                ? "danger"
                                : "warning"
                            }
                            className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0"
                          >
                            {item.status}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="pt-2">
                        <input
                          type="text"
                          value={item.observation}
                          onChange={(e) => handleItemObservationChange(section.id, item.id, e.target.value)}
                          placeholder="Agregar observación o detalle del comportamiento..."
                          className="w-full text-xs px-3 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500/20 focus:border-brand-500 text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {/* Selector de Estado */}
                    <div className="flex flex-wrap gap-1.5 shrink-0 pt-1 md:pt-0">
                      {(["PENDIENTE", "PASS", "FAIL", "WARNING"] as StatusType[]).map((statusOption) => {
                        const isSelected = item.status === statusOption;
                        let btnClass = "border border-slate-200 text-slate-650 hover:bg-slate-50";
                        
                        if (isSelected) {
                          if (statusOption === "PENDIENTE") btnClass = "bg-slate-200 text-slate-800 border-slate-300 shadow-sm";
                          if (statusOption === "PASS") btnClass = "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/10";
                          if (statusOption === "FAIL") btnClass = "bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/10";
                          if (statusOption === "WARNING") btnClass = "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/10";
                        }

                        return (
                          <button
                            key={statusOption}
                            type="button"
                            onClick={() => handleItemStatusChange(section.id, item.id, statusOption)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${btnClass}`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            {statusOption === "PENDIENTE" ? "Pendiente" : statusOption}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
