// scripts/uploadthing.js
import { UploadThingClient } from 'https://esm.sh/uploadthing/client';

const client = new UploadThingClient({
  appId: 'p3e8idcnvt' // replace with your real UploadThing App ID
});

export async function uploadImage(file) {
  const uploaded = await client.uploadFiles({
    files: [file],
    endpoint: 'imageUploader',
  });

  return uploaded[0]?.url;
}
