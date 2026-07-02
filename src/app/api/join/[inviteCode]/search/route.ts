// // src/app/api/join/[inviteCode]/search/route.ts
// // Public route — member uploads a selfie, we extract its embedding,
// // compare against every photo in the event that has embeddings, and
// // return the matches. No auth required (same trust model as /join).

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { uploadSelfie, deletePhoto } from "@/lib/cloudinary";
// import { extractEmbeddings, compareEmbeddings } from "@/lib/faceService";

// interface Params {
//   params: { inviteCode: string };
// }

// const MAX_SELFIE_SIZE = 10 * 1024 * 1024; // 10MB
// const MATCH_THRESHOLD = 0.45;

// export async function POST(req: NextRequest, { params }: Params) {
//   const event = await prisma.event.findUnique({
//     where: { inviteCode: params.inviteCode },
//   });

//   if (!event || event.status === "DELETED") {
//     return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
//   }

//   const formData = await req.formData();
//   const file = formData.get("selfie") as File | null;

//   if (!file) {
//     return NextResponse.json({ error: "No selfie provided." }, { status: 400 });
//   }
//   if (file.size > MAX_SELFIE_SIZE) {
//     return NextResponse.json({ error: "Selfie too large (max 10MB)." }, { status: 400 });
//   }

//   let selfiePublicId: string | null = null;

//   try {
//     const buffer = Buffer.from(await file.arrayBuffer());
//     const uploadResult = await uploadSelfie(buffer, event.tenantId, event.id);
//     selfiePublicId = uploadResult.publicId;

//     const faces = await extractEmbeddings(uploadResult.url);

//     if (faces.length === 0) {
//       return NextResponse.json(
//         {
//           error:
//             "We couldn't detect a face in that photo. Try a clearer, well-lit selfie facing the camera.",
//         },
//         { status: 422 }
//       );
//     }

//     // If more than one face is in the selfie, trust the most confident
//     // detection — almost always the person who took/is centered in the shot.
//     const bestFace = faces.reduce((a, b) => (a.confidence > b.confidence ? a : b));

//     // Fetch all photos for the event, then filter out those without
//     // embeddings in JS — avoids Prisma's inconsistent JSON null filter types.
//     const allPhotos = await prisma.photo.findMany({
//       where: { eventId: event.id },
//       select: { id: true, url: true, thumbnailUrl: true, embeddings: true },
//     });
//     const photos = allPhotos.filter((p) => p.embeddings !== null);

//     if (photos.length === 0) {
//       return NextResponse.json({ matches: [] });
//     }

//     const candidates: Record<string, number[][]> = {};
//     for (const photo of photos) {
//       candidates[photo.id] = photo.embeddings as unknown as number[][];
//     }

//     const { matchedPhotoIds, scores } = await compareEmbeddings(
//       bestFace.embedding,
//       candidates,
//       MATCH_THRESHOLD
//     );

//     const matches = matchedPhotoIds
//       .map((id) => {
//         const photo = photos.find((p) => p.id === id);
//         if (!photo) return null;
//         return {
//           id: photo.id,
//           url: photo.url,
//           thumbnailUrl: photo.thumbnailUrl,
//           score: scores[id],
//         };
//       })
//       .filter(Boolean);

//     return NextResponse.json({ matches });
//   } catch (error) {
//     console.error("[FACE SEARCH ERROR]", error);
//     return NextResponse.json(
//       {
//         error:
//           "Face search failed. The recognition service may still be starting up — please try again in about a minute.",
//       },
//       { status: 503 }
//     );
//   } finally {
//     // Always clean up — selfies are only needed transiently for the
//     // embedding extraction, never stored long-term.
//     if (selfiePublicId) {
//       deletePhoto(selfiePublicId).catch((e) => console.error("[SELFIE CLEANUP ERROR]", e));
//     }
//   }
// }

// src/app/api/join/[inviteCode]/search/route.ts
// Public route — member uploads a selfie, we extract its embedding,
// compare against every photo in the event that has embeddings, and
// return the matches. No auth required (same trust model as /join).
//
// Also accepts a JSON body with a cached `embedding` array instead of a
// file — this lets the client re-run the search (e.g. to pick up newly
// uploaded photos) without asking the guest for another selfie or paying
// the face-extraction cost again.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadSelfie, deletePhoto } from "@/lib/cloudinary";
import { extractEmbeddings, compareEmbeddings } from "@/lib/faceService";
import { Prisma } from "@prisma/client";

interface Params {
  params: { inviteCode: string };
}

const MAX_SELFIE_SIZE = 10 * 1024 * 1024; // 10MB
const MATCH_THRESHOLD = 0.45;

export async function POST(req: NextRequest, { params }: Params) {
  const event = await prisma.event.findUnique({
    where: { inviteCode: params.inviteCode },
  });

  if (!event || event.status === "DELETED") {
    return NextResponse.json({ error: "This invite link is no longer valid." }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  let selfiePublicId: string | null = null;
  let faceEmbedding: number[] | null = null;

  try {
    if (contentType.includes("application/json")) {
      // ── Reuse path: client already has an embedding from a previous search ──
      const body = await req.json();
      if (!Array.isArray(body.embedding)) {
        return NextResponse.json({ error: "No embedding provided." }, { status: 400 });
      }
      faceEmbedding = body.embedding;
    } else {
      // ── Fresh path: new selfie upload ──
      const formData = await req.formData();
      const file = formData.get("selfie") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No selfie provided." }, { status: 400 });
      }
      if (file.size > MAX_SELFIE_SIZE) {
        return NextResponse.json({ error: "Selfie too large (max 10MB)." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await uploadSelfie(buffer, event.tenantId, event.id);
      selfiePublicId = uploadResult.publicId;

      const faces = await extractEmbeddings(uploadResult.url);

      if (faces.length === 0) {
        return NextResponse.json(
          {
            error:
              "We couldn't detect a face in that photo. Try a clearer, well-lit selfie facing the camera.",
          },
          { status: 422 }
        );
      }

      // If more than one face is in the selfie, trust the most confident
      // detection — almost always the person who took/is centered in the shot.
      const bestFace = faces.reduce((a, b) => (a.confidence > b.confidence ? a : b));
      faceEmbedding = bestFace.embedding;
    }

   const photos = await prisma.photo.findMany({
      where: { eventId: event.id, embeddings: { not: Prisma.JsonNull } },
      select: { id: true, url: true, thumbnailUrl: true, embeddings: true },
    });

    if (photos.length === 0) {
      return NextResponse.json({ matches: [], embedding: faceEmbedding });
    }

    const candidates: Record<string, number[][]> = {};
    for (const photo of photos) {
      candidates[photo.id] = photo.embeddings as unknown as number[][];
    }

    const { matchedPhotoIds, scores } = await compareEmbeddings(
      faceEmbedding!,
      candidates,
      MATCH_THRESHOLD
    );

    const matches = matchedPhotoIds
      .map((id) => {
        const photo = photos.find((p) => p.id === id);
        if (!photo) return null;
        return {
          id: photo.id,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl,
          score: scores[id],
        };
      })
      .filter(Boolean);

    return NextResponse.json({ matches, embedding: faceEmbedding });
  } catch (error) {
    console.error("[FACE SEARCH ERROR]", error);
    return NextResponse.json(
      {
        error:
          "Face search failed. The recognition service may still be starting up — please try again in about a minute.",
      },
      { status: 503 }
    );
  } finally {
    // Only clean up if we actually uploaded a fresh selfie this call.
    if (selfiePublicId) {
      deletePhoto(selfiePublicId).catch((e) => console.error("[SELFIE CLEANUP ERROR]", e));
    }
  }
}