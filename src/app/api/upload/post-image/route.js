const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function POST(request) {
  try {
    const formData = await request.formData();

    // Forward the request to the backend server
    const backendResponse = await fetch(`${API_BASE_URL}/upload/post-image`, {
      method: "POST",
      body: formData,
    });

    const contentType = backendResponse.headers.get("content-type");

    if (!backendResponse.ok) {
      let errorMessage = "Upload failed";

      if (contentType && contentType.includes("application/json")) {
        try {
          const errorData = await backendResponse.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Error parsing backend error response:", parseError);
        }
      } else {
        const htmlError = await backendResponse.text();
        console.error("Backend returned HTML instead of JSON:", htmlError);
        errorMessage = `Backend server error (${backendResponse.status})`;
      }

      return Response.json(
        { message: errorMessage },
        { status: backendResponse.status }
      );
    }

    if (contentType && contentType.includes("application/json")) {
      const data = await backendResponse.json();
      return Response.json(data);
    } else {
      throw new Error("Backend did not return JSON response");
    }
  } catch (error) {
    console.error("Post image upload error:", error);

    if (error.code === "ECONNREFUSED") {
      return Response.json(
        { message: "Backend server is not running. Please start the server." },
        { status: 503 }
      );
    }

    return Response.json(
      { message: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
