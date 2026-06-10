"use client";

import { useCallback, useEffect, useState } from "react";

import LayersPanel from "./layers-panel";
import type { DevelopmentDrawableLayerDto, DrawableLayerTipo } from "@/types/development-layers";

interface ProjectLayersEditorPanelProps {
    proyectoId: string;
    onClose: () => void;
}

export default function ProjectLayersEditorPanel({
    proyectoId,
    onClose,
}: ProjectLayersEditorPanelProps) {
    const [layers, setLayers] = useState<DevelopmentDrawableLayerDto[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

    const readJsonResponse = useCallback(async (response: Response) => {
        const raw = await response.text();
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }, []);

    const updateLayerLocal = useCallback((layer: DevelopmentDrawableLayerDto) => {
        setLayers((current) => {
            const exists = current.some((item) => item.id === layer.id);
            const next = exists
                ? current.map((item) => (item.id === layer.id ? layer : item))
                : [...current, layer];
            return next.sort((a, b) => a.orden - b.orden);
        });
    }, []);

    const loadLayers = useCallback(async () => {
        const response = await fetch(`/api/developments/${proyectoId}/layers`);
        const data = await readJsonResponse(response);
        if (response.ok && Array.isArray(data.layers)) {
            setLayers(data.layers);
        }
    }, [proyectoId, readJsonResponse]);

    useEffect(() => {
        void loadLayers();
    }, [loadLayers]);

    const createLayer = useCallback(async (payload: {
        nombre: string;
        tipo: DrawableLayerTipo;
        colorRelleno: string;
        colorBorde: string;
        opacidad: number;
        grosorBorde: number;
    }) => {
        const response = await fetch(`/api/developments/${proyectoId}/layers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
            throw new Error(data.error || "No se pudo crear la capa.");
        }
        if (data.layer) {
            updateLayerLocal(data.layer);
            setActiveLayerId(data.layer.id);
        }
    }, [proyectoId, readJsonResponse, updateLayerLocal]);

    const updateLayer = useCallback(async (
        layerId: string,
        payload: Partial<DevelopmentDrawableLayerDto>,
    ) => {
        const response = await fetch(`/api/developments/${proyectoId}/layers`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: layerId, ...payload }),
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
            throw new Error(data.error || "No se pudo actualizar la capa.");
        }
        if (data.layer) updateLayerLocal(data.layer);
    }, [proyectoId, readJsonResponse, updateLayerLocal]);

    const deleteLayer = useCallback(async (layerId: string) => {
        const response = await fetch(`/api/developments/${proyectoId}/layers?layerId=${encodeURIComponent(layerId)}`, {
            method: "DELETE",
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
            throw new Error(data.error || "No se pudo eliminar la capa.");
        }
        setLayers((current) => current.filter((layer) => layer.id !== layerId));
        setActiveLayerId((current) => (current === layerId ? null : current));
    }, [proyectoId, readJsonResponse]);

    return (
        <LayersPanel
            layers={layers}
            activeLayerId={activeLayerId}
            drawingLayerId={null}
            canDraw={false}
            disabledReason="El dibujo directo sobre el plano visual requiere la Fase 2 con coordenadas SVG/canvas. Desde aca ya podes crear capas, editar estilos, mostrar/ocultar y eliminar."
            onClose={onClose}
            onCreate={createLayer}
            onUpdate={updateLayer}
            onDelete={deleteLayer}
            onSelect={setActiveLayerId}
            onStartDraw={() => undefined}
        />
    );
}
