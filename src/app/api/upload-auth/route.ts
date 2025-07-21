// File: app/api/upload-auth/route.ts
import { getUploadAuthParams } from "@imagekit/next/server";

export async function GET() {
  try {
    const authenticParameters = getUploadAuthParams({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
      publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY as string,
      expire: Math.floor(Date.now() / 1000) + 30 * 60, // ✅ Fixed
    });

    return Response.json({
      authenticParameters,
      publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY,
      urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT,
    });
  } catch (error) {
    console.error("ImageKit auth error:", error);
    return Response.json(
      { error: "ImageKit authentication failed" },
      { status: 500 }
    );
  }
}
