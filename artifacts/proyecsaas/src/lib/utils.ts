import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatWeekday(weekday: number) {
  const labels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return labels[weekday] ?? "Unknown day";
}

export function formatMinuteRange(startMinute: number, endMinute: number) {
  const formatSingle = (value: number) => {
    const hours = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const minutes = (value % 60).toString().padStart(2, "0");

    return `${hours}:${minutes}`;
  };

  return `${formatSingle(startMinute)} - ${formatSingle(endMinute)}`;
}
