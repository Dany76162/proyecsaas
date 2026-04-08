-- Ensure Organization exists
INSERT INTO "Organization" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES ('org_north', 'North Hill Realty', 'north-hill', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Inject User
INSERT INTO "User" ("id", "email", "fullName", "isActive", "isPlatformAdmin", "createdAt", "updatedAt")
VALUES ('user_cata', 'danielcata2023@gmail.com', 'Daniel Cata', true, false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Link User to Organization
INSERT INTO "Membership" ("id", "organizationId", "userId", "role", "createdAt")
VALUES ('mem_cata', 'org_north', 'user_cata', 'OWNER', NOW())
ON CONFLICT (id) DO NOTHING;
