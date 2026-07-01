"use server";

import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { revalidatePath } from "next/cache";

// --- Messages ---
export async function createMessage(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMessage.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateMessage(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMessage.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleMessage(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMessage.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- Materials ---
export async function createMaterial(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMaterial.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateMaterial(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMaterial.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleMaterial(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMaterial.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- Arguments ---
export async function createArgument(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryArgument.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateArgument(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryArgument.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleArgument(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryArgument.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- FAQs ---
export async function createFaq(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryFAQ.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateFaq(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryFAQ.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleFaq(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryFAQ.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- Objections ---
export async function createObjection(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryObjection.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateObjection(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryObjection.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleObjection(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryObjection.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}
