import { conntodb } from "@/lib/db"
import Video from "@/models/Video"
import { type NextRequest, NextResponse } from "next/server"

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

interface YouTubeVideo {
  id: {
    videoId: string
  }
  snippet: {
    title: string
    description: string
    thumbnails: {
      medium?: {
        url: string
      }
      high?: {
        url: string
      }
    }
    channelTitle: string
    publishedAt: string
  }
}

interface YouTubeSearchResponse {
  items: YouTubeVideo[]
  nextPageToken?: string
  pageInfo: {
    totalResults: number
  }
}

interface YouTubeVideoStats {
  id: string
  statistics: {
    viewCount?: string
    likeCount?: string
  }
  contentDetails: {
    duration: string
  }
}

interface YouTubeStatsResponse {
  items: YouTubeVideoStats[]
}

interface EnhancedVideo {
  videoId: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
  viewCount: number
  likeCount: number
  duration: number
  isShort: boolean
  embedUrl: string
  watchUrl: string
}

interface LocalVideo {
  _id: string
  title: string
  description: string
  username: string
  videourl: string
  thumbnailurl: string
  likes: number
  views: number
  createdAt: string
}

// Type for MongoDB document result
interface MongoVideoDocument {
  _id: unknown
  title?: string
  description?: string
  username?: string
  videourl?: string
  thumbnailurl?: string
  likes?: number
  views?: number
  createdAt?: string
  __v?: number
  [key: string]: unknown
}

async function searchYouTubeShorts(query: string, maxResults = 20): Promise<EnhancedVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error("❌ YouTube API key not found in environment variables")
    return []
  }

  console.log(`🔍 Searching YouTube for: "${query}" (max: ${maxResults})`)

  try {
    // Search for shorts specifically
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search")
    searchUrl.searchParams.append("part", "snippet")
    searchUrl.searchParams.append("q", `${query} shorts`)
    searchUrl.searchParams.append("type", "video")
    searchUrl.searchParams.append("videoDuration", "short")
    searchUrl.searchParams.append("order", "relevance")
    searchUrl.searchParams.append("maxResults", maxResults.toString())
    searchUrl.searchParams.append("key", YOUTUBE_API_KEY)

    console.log("📡 Making YouTube search request...")
    const response = await fetch(searchUrl.toString())

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ YouTube API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })

      // Check for quota exceeded
      if (response.status === 403 && errorText.includes("quota")) {
        console.error("🚫 YouTube API quota exceeded")
      }

      return []
    }

    const data: YouTubeSearchResponse = await response.json()
    console.log("📊 YouTube search response:", {
      totalResults: data.pageInfo?.totalResults,
      itemsReturned: data.items?.length || 0,
    })

    if (!data.items || data.items.length === 0) {
      console.log("⚠️ No YouTube videos found for query")
      return []
    }

    // Get video statistics for each video
    const videoIds = data.items.map((item) => item.id.videoId).join(",")
    console.log(`📹 Getting stats for ${data.items.length} videos...`)

    const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos")
    statsUrl.searchParams.append("part", "statistics,contentDetails")
    statsUrl.searchParams.append("id", videoIds)
    statsUrl.searchParams.append("key", YOUTUBE_API_KEY)

    const statsResponse = await fetch(statsUrl.toString())

    if (!statsResponse.ok) {
      console.error("❌ YouTube stats API error:", statsResponse.status, statsResponse.statusText)
      // Return basic videos without stats
      return data.items.map((video) => ({
        videoId: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || "",
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        viewCount: 0,
        likeCount: 0,
        duration: 30, // Assume 30 seconds for shorts
        isShort: true,
        embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      }))
    }

    const statsData: YouTubeStatsResponse = await statsResponse.json()

    // Combine search results with statistics
    const enhancedVideos: EnhancedVideo[] = data.items.map((video, index) => {
      const stats = statsData.items?.[index]
      const duration = stats?.contentDetails?.duration || "PT30S"

      // Parse ISO 8601 duration (PT1M30S -> 90 seconds)
      const durationMatch = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/)
      const minutes = Number.parseInt(durationMatch?.[1] || "0")
      const seconds = Number.parseInt(durationMatch?.[2] || "0")
      const totalSeconds = minutes * 60 + seconds

      return {
        videoId: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || "",
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        viewCount: Number.parseInt(stats?.statistics?.viewCount || "0"),
        likeCount: Number.parseInt(stats?.statistics?.likeCount || "0"),
        duration: totalSeconds || 30,
        isShort: totalSeconds <= 60 || totalSeconds === 0,
        embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      }
    })

    console.log(`✅ Successfully processed ${enhancedVideos.length} YouTube videos`)
    return enhancedVideos
  } catch (error) {
    console.error("💥 Error fetching YouTube shorts:", error)
    return []
  }
}

async function getTrendingYouTubeShorts(): Promise<EnhancedVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key not found")
    return []
  }

  try {
    // Get trending shorts
    const trendingQueries = [
      "viral shorts trending",
      "popular shorts today",
      "trending short videos",
      "viral short form content",
    ]

    const allShorts: EnhancedVideo[] = []

    for (const trendingQuery of trendingQueries) {
      const shorts = await searchYouTubeShorts(trendingQuery, 10)
      allShorts.push(...shorts)
    }

    // Remove duplicates and sort by view count
    const uniqueShorts = allShorts.filter(
      (video, index, self) => index === self.findIndex((v) => v.videoId === video.videoId),
    )

    return uniqueShorts.sort((a, b) => b.viewCount - a.viewCount).slice(0, 20)
  } catch (error) {
    console.error("Error fetching trending YouTube shorts:", error)
    return []
  }
}

// Helper function to safely convert MongoDB document to LocalVideo
function convertToLocalVideo(doc: MongoVideoDocument): LocalVideo | null {
  try {
    // Validate required fields exist
    if (!doc.title || !doc.username || !doc.videourl) {
      console.warn("Missing required fields in video document:", doc._id)
      return null
    }

    return {
      _id: String(doc._id),
      title: String(doc.title),
      description: String(doc.description || ""),
      username: String(doc.username),
      videourl: String(doc.videourl),
      thumbnailurl: String(doc.thumbnailurl || ""),
      likes: Number(doc.likes || 0),
      views: Number(doc.views || 0),
      createdAt: String(doc.createdAt || new Date().toISOString()),
    }
  } catch (error) {
    console.error("Error converting document to LocalVideo:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Search API called with URL:", request.url)

    // Log environment variables (without exposing the key)
    console.log("📊 Environment check:", {
      hasYouTubeKey: !!process.env.YOUTUBE_API_KEY,
      keyLength: process.env.YOUTUBE_API_KEY?.length || 0,
    })

    await conntodb()
    console.log("✅ Database connected successfully")

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const trending = searchParams.get("trending")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    console.log("📝 Search parameters:", { query, trending, limit })

    // Handle trending shorts request
    if (trending === "true") {
      console.log("🔥 Fetching trending shorts...")
      const trendingShorts = await getTrendingYouTubeShorts()
      console.log(`✅ Found ${trendingShorts.length} trending shorts`)

      return NextResponse.json({
        shorts: trendingShorts,
        totalResults: trendingShorts.length,
        searchType: "trending_shorts",
      })
    }

    if (!query) {
      console.log("❌ No search query provided")
      return NextResponse.json({ error: "Search query required" }, { status: 400 })
    }

    console.log(`🔍 Searching for: "${query}"`)

    // Search both YouTube and local database
    console.log("📡 Starting parallel searches...")
    const [youtubeShorts, localVideos] = await Promise.allSettled([
      searchYouTubeShorts(query, limit),
      Video.find({
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { username: { $regex: query, $options: "i" } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ])

    console.log("📊 Search results status:", {
      youtube: youtubeShorts.status,
      local: localVideos.status,
    })

    // Process results
    const shorts = youtubeShorts.status === "fulfilled" ? youtubeShorts.value : []
    console.log(`🎬 YouTube shorts found: ${shorts.length}`)

    if (youtubeShorts.status === "rejected") {
      console.error("❌ YouTube search failed:", youtubeShorts.reason)
    }

    // Safely convert MongoDB documents to LocalVideo objects
    let videos: LocalVideo[] = []
    if (localVideos.status === "fulfilled") {
      const rawVideos = localVideos.value as MongoVideoDocument[]
      console.log(`📹 Raw local videos found: ${rawVideos.length}`)
      videos = rawVideos.map(convertToLocalVideo).filter((video): video is LocalVideo => video !== null)
      console.log(`✅ Valid local videos: ${videos.length}`)
    } else {
      console.error("❌ Local video search failed:", localVideos.reason)
    }

    // Extract unique usernames from local videos
    const users = [...new Set(videos.map((video) => video.username))]

    // Generate hashtags
    const hashtags = [
      `#${query.toLowerCase()}`,
      `#${query.toLowerCase()}shorts`,
      `#shorts${query.toLowerCase()}`,
      "#shorts",
      "#viral",
      `#trending${query.toLowerCase()}`,
    ]

    const totalResults = shorts.length + videos.length
    console.log(`🎯 Total results: ${totalResults} (YouTube: ${shorts.length}, Local: ${videos.length})`)

    // If no results, provide helpful debugging info
    if (totalResults === 0) {
      console.log("⚠️ No results found, providing debug info")
      return NextResponse.json({
        shorts: [],
        videos: [],
        users,
        hashtags,
        totalResults: 0,
        searchType: "combined",
        debug: {
          query,
          hasYouTubeKey: !!process.env.YOUTUBE_API_KEY,
          youtubeStatus: youtubeShorts.status,
          localStatus: localVideos.status,
          youtubeError: youtubeShorts.status === "rejected" ? String(youtubeShorts.reason) : null,
          localError: localVideos.status === "rejected" ? String(localVideos.reason) : null,
        },
        message: `No results found for "${query}". Try searching for popular topics like "cricket", "music", "dance", or "comedy".`,
      })
    }

    return NextResponse.json({
      shorts, // YouTube Shorts
      videos, // Local database videos
      users,
      hashtags,
      totalResults,
      searchType: "combined",
    })
  } catch (error) {
    console.error("💥 Search API error:", error)
    return NextResponse.json(
      {
        error: "Search failed",
        shorts: [],
        videos: [],
        users: [],
        hashtags: [],
        debug: {
          error: String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      },
      { status: 500 },
    )
  }
}
