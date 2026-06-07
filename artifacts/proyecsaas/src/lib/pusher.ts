// Mock implementation of Pusher to satisfy typechecking without external dependencies
export function getPusherServer(): any {
    return null;
}

export function getPusherClient(): any {
    return null;
}

export const CHANNELS = {
    RESERVAS: "reservas",
    UNIDADES: "unidades",
} as const;

export const EVENTS = {
    RESERVA_CREATED: "reserva:created",
    RESERVA_UPDATED: "reserva:updated",
    RESERVA_EXPIRED: "reserva:expired",
    RESERVA_CANCELLED: "reserva:cancelled",
    RESERVA_CONVERTED: "reserva:converted",
    UNIDAD_STATUS_CHANGED: "unidad:status-changed",
    NOTIFICATION_NEW: "new-notification",
    USER_UPDATED: "user:updated",
} as const;

export const PUSHER_CHANNELS = {
    getUserChannel: (userId: string) => `private-user-${userId}-notifications`,
    getProjectChannel: (projectId: string) => `private-project-${projectId}`,
};
