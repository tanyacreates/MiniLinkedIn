import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const backendUrl = `${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`;
    const backendResponse = await fetch(backendUrl);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("Backend user search failed:", errorText);
      return NextResponse.json(
        { error: "Backend user search failed" },
        { status: backendResponse.status }
      );
    }

    const users = await backendResponse.json();
    return NextResponse.json(users);
  } catch (error) {
    console.error("User search proxy error:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
