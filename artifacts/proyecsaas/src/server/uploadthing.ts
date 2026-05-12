import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSessionUser } from "@/server/auth/session";

const f = createUploadthing();

export const ourFileRouter = {
  /**
   * Uploader for property images.
   * Auth: requires a valid session. Per-property/org ownership is validated
   * downstream in addPropertyImageAction â€” the upload itself only needs a
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
      return { url: file.url };
    }),

  /**
   * Uploader for property video (tour virtual / recorrido).
   * One video per upload. Ownership validated downstream in setPropertyVideoAction.
   * 128 MB covers ~2 min of 1080p phone footage. Heavier content should use
   * YouTube/Vimeo and paste the URL in the external URL field.
   */
  propertyVideoUploader: f({
    video: { maxFileSize: "128MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getSessionUser();
      if (!user) throw new UploadThingError("No autorizado.");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
