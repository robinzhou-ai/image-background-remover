import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 });
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Remove.bg API key not configured." }, { status: 500 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const removeBgResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: buffer,
    });

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text();
      console.error("Remove.bg API error:", errorText);
      return NextResponse.json({ error: "Failed to process image with Remove.bg API." }, { status: 500 });
    }

    const resultBuffer = await removeBgResponse.arrayBuffer();

    return new NextResponse(Buffer.from(resultBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error processing image:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
