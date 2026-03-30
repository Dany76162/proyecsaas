import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSessionUser } from "@/server/auth/session";

const f = createUploadthing();

export const ourFileRouter = {
  /**
   * Uploader for property images.
   * Auth: requires a valid session. Per-property/org ownership is validated
   * downstream in addPropertyImageAction — the upload itself only needs a
   * logged-in user so anonymous actors can't fill up storage.
   */
  propertyImageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 8 },
  })
    .middleware(async () => {
      const user = await getSessionUser();
      if (!user) throw new UploadThingError("No autorizado.");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      // Returns data to the client via onClientUploadComplete
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
