export type TenantContext = {
  organizationId: string;
  organizationSlug: string;
  userId?: string;
};

export function assertTenantScope<T extends { organizationId: string }>(
  tenant: TenantContext,
  entity: T,
) {
  if (entity.organizationId !== tenant.organizationId) {
    throw new Error("Cross-tenant access is not allowed.");
  }

  return entity;
}

