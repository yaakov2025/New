import { mutation } from "./_generated/server";

// Generate a short-lived upload URL for the client to POST file contents to.
// The client then saves the returned storageId via the relevant create mutation.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
