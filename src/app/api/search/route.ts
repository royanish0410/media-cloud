import { conntodb } from "@/lib/db";
import Video from "@/models/Video";
import { NextRequest, NextResponse } from "next/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: {
        url: string;
      };
      high: {
        url: string;
      };
    };
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
  };
}

async function searchYouTubeShorts(query: string, maxResults: number = Infinity): Promise<any[]> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key not found");
    return [];
  }

  try {
    // Search for shorts specifically
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.append("part", "snippet");
    searchUrl.searchParams.append("q", `${query} #shorts`);
    searchUrl.searchParams.append("type", "video");
    searchUrl.searchParams.append("videoDuration", "short"); // Videos under 4 minutes
    searchUrl.searchParams.append("order", "relevance");
    searchUrl.searchParams.append("maxResults", maxResults.toString());
    searchUrl.searchParams.append("key", YOUTUBE_API_KEY);

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      console.error("YouTube API error:", response.status, response.statusText);
      return [];
    }

    const data: YouTubeSearchResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    // Get video statistics for each video
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    statsUrl.searchParams.append("part", "statistics,contentDetails");
    statsUrl.searchParams.append("id", videoIds);
    statsUrl.searchParams.append("key", YOUTUBE_API_KEY);

    const statsResponse = await fetch(statsUrl.toString());
    const statsData = await statsResponse.json();

    // Combine search results with statistics
    const enhancedVideos = data.items.map((video, index) => {
      const stats = statsData.items?.[index];
      const duration = stats?.contentDetails?.duration || "PT0S";
      
      // Parse ISO 8601 duration (PT1M30S -> 90 seconds)
      const durationMatch = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
      const minutes = parseInt(durationMatch?.[1] || "0");
      const seconds = parseInt(durationMatch?.[2] || "0");
      const totalSeconds = minutes * 60 + seconds;

      return {
        videoId: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(stats?.statistics?.viewCount || "0"),
        likeCount: parseInt(stats?.statistics?.likeCount || "0"),
        duration: totalSeconds,
        isShort: totalSeconds <= 60, // Consider videos under 60 seconds as shorts
        embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      };
    });

    // Filter for actual shorts (videos under 60 seconds)
    return enhancedVideos.filter(video => video.isShort || video.duration <= 60);

  } catch (error) {
    console.error("Error fetching YouTube shorts:", error);
    return [];
  }
}

async function getTrendingYouTubeShorts(): Promise<any[]> {
  if (!YOUTUBE_API_KEY) {
    console.error("YouTube API key not found");
    return [];
  }

  try {
    // Get trending shorts
    const trendingQueries = [
      "viral shorts trending",
      "popular shorts today",
      "trending short videos",
      "viral short form content"
    ];

    const allShorts = [];
    
    for (const trendingQuery of trendingQueries) {
      const shorts = await searchYouTubeShorts(trendingQuery, 10);
      allShorts.push(...shorts);
    }

    // Remove duplicates and sort by view count
    const uniqueShorts = allShorts.filter((video, index, self) => 
      index === self.findIndex(v => v.videoId === video.videoId)
    );

    return uniqueShorts
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 20);

  } catch (error) {
    console.error("Error fetching trending YouTube shorts:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    await conntodb();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const trending = searchParams.get("trending");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Handle trending shorts request
    if (trending === "true") {
      const trendingShorts = await getTrendingYouTubeShorts();
      
      return NextResponse.json({
        shorts: trendingShorts,
        totalResults: trendingShorts.length,
        searchType: "trending_shorts",
      });
    }

    if (!query) {
      return NextResponse.json(
        { error: "Search query required" },
        { status: 400 }
      );
    }

    // Search both YouTube and local database
    const [youtubeShorts, localVideos] = await Promise.allSettled([
      searchYouTubeShorts(query, limit),
      Video.find({
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } }, // Fixed typo
          { username: { $regex: query, $options: "i" } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    ]);

    // Process results
    const shorts = youtubeShorts.status === "fulfilled" ? youtubeShorts.value : [];
    const videos = localVideos.status === "fulfilled" ? localVideos.value : [];

    // Extract unique usernames from local videos
    const users = [...new Set(videos.map((video: any) => video.username))];

    // Generate hashtags
    const hashtags = [
      `#${query.toLowerCase()}`,
      `#${query.toLowerCase()}shorts`,
      `#shorts${query.toLowerCase()}`,
      "#shorts",
      "#viral",
      `#trending${query.toLowerCase()}`,
    ];

    return NextResponse.json({
      shorts, // YouTube Shorts
      videos, // Local database videos
      users,
      hashtags,
      totalResults: shorts.length + videos.length,
      searchType: "combined",
    });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ 
      error: "Search failed", 
      shorts: [],
      videos: [],
      users: [],
      hashtags: []
    }, { status: 500 });
  }
}