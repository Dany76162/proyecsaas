INSERT INTO "User" (id, email, "fullName", "isActive") 
SELECT 'user_cata', 'danielcata2023@gmail.com', 'Daniel Cata', true
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'danielcata2023@gmail.com');

INSERT INTO "Membership" (id, "organizationId", "userId", "role")
SELECT 'mem_cata', 'org_north', 'user_cata', 'OWNER'
WHERE NOT EXISTS (SELECT 1 FROM "Membership" WHERE id = 'mem_cata');
