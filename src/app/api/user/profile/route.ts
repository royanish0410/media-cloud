import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

// In-memory storage for demo purposes
// In a real app, you would use a database
const profileStorage = new Map<
  string,
  {
    name: string
    bio: string
    image?: string
    email: string
    updatedAt: string
  }
>()

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, bio, image } = await req.json()

    // Validate input
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (typeof bio !== "string") {
      return NextResponse.json({ error: "Bio must be a string" }, { status: 400 })
    }

    // Store the profile data
    const updatedProfile = {
      name: name.trim(),
      bio: bio.trim(),
      image: image || undefined,
      email: session.user.email,
      updatedAt: new Date().toISOString(),
    }

    profileStorage.set(session.user.email, updatedProfile)

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: "Profile updated successfully",
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get stored profile data
    const storedProfile = profileStorage.get(session.user.email)

    if (storedProfile) {
      // Return stored profile data
      return NextResponse.json({
        profile: {
          name: storedProfile.name,
          email: storedProfile.email,
          image: storedProfile.image,
          bio: storedProfile.bio,
        },
      })
    } else {
      // Return session data as fallback for first-time users
      const profile = {
        name: session.user.name || "",
        email: session.user.email,
        image: session.user.image || undefined,
        bio: "",
      }
      return NextResponse.json({ profile })
    }
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
