"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface CriticalValueAlert {
  id: string;
  orderId: string;
  orderDetailId: string;
  testId: string;
  patientId: string;
  resultValue: string;
  flaggedAt: string;
  notificationStatus: string;
  patientName?: string;
  testName?: string;
  orderNumber?: string;
}

interface UseCriticalValueSocketOptions {
  /** Callback when a new critical value alert arrives */
  onNewAlert?: (alert: CriticalValueAlert) => void;
  /** Callback when a critical value is escalated */
  onEscalated?: (alert: CriticalValueAlert) => void;
  /** Whether the socket connection should be active */
  enabled?: boolean;
}

const WS_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function useCriticalValueSocket(options: UseCriticalValueSocketOptions = {}) {
  const { onNewAlert, onEscalated, enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const onNewAlertRef = useRef(onNewAlert);
  const onEscalatedRef = useRef(onEscalated);

  // Keep refs updated to avoid stale closures
  onNewAlertRef.current = onNewAlert;
  onEscalatedRef.current = onEscalated;

  useEffect(() => {
    if (!enabled) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("elis_token")
        : null;

    const socket = io(`${WS_URL}/ws`, {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Join the critical-value room for real-time updates
      socket.emit("join-clinic", "critical-values");
    });

    socket.on("critical-value:new", (data: CriticalValueAlert) => {
      onNewAlertRef.current?.(data);
    });

    socket.on("critical-value:escalated", (data: CriticalValueAlert) => {
      onEscalatedRef.current?.(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  const isConnected = useCallback(() => {
    return socketRef.current?.connected ?? false;
  }, []);

  return { isConnected };
}
