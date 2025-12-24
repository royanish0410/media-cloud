"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  TrendingUp,
  Flame,
  Hash,
  Play,
  Heart,
  Eye,
  Clock,
  Video,
  Share2,
  MessageCircle,
  ThumbsDown,
  AlertCircle,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface SearchResult {
  videos: any[]
  users: string[]
  hashtags: string[]
  shorts?: any[]
  nextPageToken?: string
  message?: string
  error?: string
}

const TRENDING_HASHTAGS = [
  "#viral",
  "#funny",
  "#dance",
  "#music",
  "#trending",
  "#comedy",
  "#art",
  "#food",
  "#travel",
  "#fitness",
  "#education",
  "#gaming",
  "#shorts",
  "#reels",
  "#cricket",
  "#football",
  "#basketball",
  "#cooking",
  "#fashion",
  "#tech",
]

const POPULAR_CATEGORIES = [
  { name: "Comedy", icon: "😂", count: "1.2M" },
  { name: "Music", icon: "🎵", count: "950K" },
  { name: "Dance", icon: "💃", count: "800K" },
  { name: "Food", icon: "🍔", count: "650K" },
  { name: "Travel", icon: "✈️", count: "500K" },
  { name: "Art", icon: "🎨", count: "400K" },
  { name: "Gaming", icon: "🎮", count: "750K" },
  { name: "Cricket", icon: "🏏", count: "900K" },
  { name: "Football", icon: "⚽", count: "1.1M" },
  { name: "Fashion", icon: "👗", count: "800K" },
  { name: "Tech", icon: "📱", count: "600K" },
  { name: "Cooking", icon: "👨‍🍳", count: "700K" },
]

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult>({
    videos: [],
    users: [],
    hashtags: [],
    shorts: [],
  })
  const [trendingVideos, setTrendingVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("discover")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null)
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrendingVideos()
    loadRecentSearches()
  }, [])

  const loadRecentSearches = () => {
    const saved = localStorage.getItem("recentSearches")
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 10)
    setRecentSearches(updated)
    localStorage.setItem("recentSearches", JSON.stringify(updated))
  }

  const fetchTrendingVideos = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔥 Fetching trending videos...")
      const response = await fetch("/api/search?q=trending viral shorts")

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("📊 Trending response:", data)

      if (data.error) {
        setError(data.error)
        setTrendingVideos([])
      } else if (data.shorts && data.shorts.length > 0) {
        console.log(`✅ Loaded ${data.shorts.length} trending videos`)
        setTrendingVideos(data.shorts.slice(0, 20))
      } else {
        console.log("⚠️ No trending videos found")
        console.log("Debug info:", data.debug)
        setTrendingVideos([])
        if (data.debug) {
          setError(
            `Debug: YouTube API ${data.debug.hasYouTubeKey ? "configured" : "missing"}, Status: ${data.debug.youtubeStatus}`,
          )
        }
      }
    } catch (error) {
      console.error("❌ Error fetching trending videos:", error)
      setError("Failed to load trending videos. Please check your API configuration.")
      setTrendingVideos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return

    try {
      setLoading(true)
      setError(null)
      setActiveTab("results")
      saveRecentSearch(query)

      console.log(`🔍 Searching for: "${query}"`)

      // Search both main API and local API
      const [mainSearchResponse, localSearchResponse] = await Promise.allSettled([
        fetch(`/api/search?q=${encodeURIComponent(query)}`),
        fetch(`/api/search/local?q=${encodeURIComponent(query)}`),
      ])

      const combinedResults: SearchResult = {
        videos: [],
        users: [],
        hashtags: [],
        shorts: [],
      }

      // Process main search results
      if (mainSearchResponse.status === "fulfilled" && mainSearchResponse.value.ok) {
        const mainData = await mainSearchResponse.value.json()
        console.log("📊 Main search response:", mainData)

        if (mainData.error) {
          setError(mainData.error)
        } else {
          combinedResults.shorts = mainData.shorts || []
          combinedResults.nextPageToken = mainData.nextPageToken
          console.log(`✅ Main search found ${combinedResults.shorts.length} shorts`)

          // Show debug info if no results
          if (combinedResults.shorts.length === 0 && mainData.debug) {
            console.log("🐛 Debug info:", mainData.debug)
            setError(
              `No results found. Debug: API ${mainData.debug.hasYouTubeKey ? "configured" : "missing"}, YouTube: ${mainData.debug.youtubeStatus}, Local: ${mainData.debug.localStatus}`,
            )
          }
        }
      } else {
        console.log("⚠️ Main search failed:", mainSearchResponse)
      }

      // Process local search results
      if (localSearchResponse.status === "fulfilled" && localSearchResponse.value.ok) {
        const localData = await localSearchResponse.value.json()
        console.log("📊 Local search response:", localData)

        if (!localData.error) {
          combinedResults.videos = localData.videos || []
          combinedResults.users = [...(combinedResults.users || []), ...(localData.users || [])]
          combinedResults.hashtags = localData.hashtags || []
          console.log(`✅ Local search found ${combinedResults.videos.length} videos`)
        }
      } else {
        console.log("⚠️ Local search failed:", localSearchResponse)
      }

      // Set results
      setSearchResults(combinedResults)

      // Show message if no results
      const totalResults = (combinedResults.shorts?.length || 0) + (combinedResults.videos?.length || 0)
      if (totalResults === 0 && !error) {
        setError(
          `No ${query} shorts found. Try different keywords like "${query} viral", "${query} funny", or "${query} trending". Check browser console for debug info.`,
        )
      }
    } catch (error) {
      console.error("💥 Search error:", error)
      setError("Search failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem("recentSearches")
  }

  const handleVideoClick = (video: any) => {
    setSelectedVideo(video)
  }

  const closeVideoModal = () => {
    setSelectedVideo(null)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
    return `${Math.ceil(diffDays / 365)} years ago`
  }

  const renderPlayableVideoCard = (video: any, index?: number) => {
    const videoId = video._id || video.videoId || `video-${index}`
    const isShort = video.videoId || video.duration
    const videoUrl = video.videourl || `https://www.youtube.com/embed/${video.videoId}`
    const thumbnailUrl = video.thumbnailurl || video.thumbnail
    const title = video.title
    const creator = video.username || video.channelTitle
    const likes = video.likes || 0
    const views = video.views || video.viewCount || 0
    const createdAt = video.createdAt || video.publishedAt
    const isPlaying = playingVideos[videoId]

    return (
      <div
        key={videoId}
        className="relative w-full max-w-[400px] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Video Player */}
        <div className="relative aspect-[9/16] bg-black">
          {isShort && video.videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${video.videoId}?autoplay=${isPlaying ? 1 : 0}&mute=1&playsinline=1&controls=1&modestbranding=1&rel=0&showinfo=0`}
              title={title}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <video
              src={videoUrl}
              poster={thumbnailUrl}
              className="w-full h-full object-cover"
              controls
              muted
              playsInline
              autoPlay={isPlaying}
            />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Video Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold leading-tight line-clamp-2">{title}</h3>
              {creator && <p className="text-sm text-gray-300">@{creator}</p>}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(views)}</span>
                </div>
                {createdAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(createdAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ranking Badge */}
          {index !== undefined && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm">
                <Flame className="w-3 h-3 mr-1" />#{index + 1}
              </Badge>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10">
          {/* Like Button */}
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-all backdrop-blur-sm">
              <Heart className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">{formatNumber(likes)}</span>
          </button>

          {/* Dislike Button */}
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 rounded-full bg-black/50 text-white hover:bg-gray-600/80 transition-all backdrop-blur-sm">
              <ThumbsDown className="w-6 h-6" />
            </div>
          </button>

          {/* Comments Button */}
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 rounded-full bg-black/50 text-white hover:bg-blue-600/80 transition-all backdrop-blur-sm">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">0</span>
          </button>

          {/* Share Button */}
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 rounded-full bg-black/50 text-white hover:bg-green-600/80 transition-all backdrop-blur-sm">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">Share</span>
          </button>
        </div>
      </div>
    )
  }

  const renderVideoGrid = (videos: any[], showRanking = false) => {
    if (videos.length === 0) return null

    return (
      <div className="space-y-8">
        {videos.map((video, index) => (
          <div key={video._id || video.videoId || index} className="flex justify-center">
            {renderPlayableVideoCard(video, showRanking ? index : undefined)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content - Properly positioned to avoid sidebar overlap */}
      <div className="ml-0 md:ml-64 lg:ml-72 xl:ml-80 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Search Header */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-700 p-6 sm:p-8 mb-6 sm:mb-8">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Discover Amazing Shorts</h1>
              <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
                Search for any topic and find the best shorts - cricket, music, dance, comedy, and more!
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search any topic: cricket, music, dance, comedy, food..."
                  className="pl-12 pr-20 py-3 sm:py-4 text-base sm:text-lg bg-gray-800 border-gray-600 text-white rounded-xl focus:border-red-500 focus:ring-red-500 placeholder-gray-400"
                />
                <Button
                  onClick={() => handleSearch()}
                  disabled={!searchQuery.trim() || loading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
                >
                  {loading ? "..." : "Search"}
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="max-w-2xl mx-auto mb-6">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && activeTab === "discover" && (
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Recent Searches</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-red-600/20 hover:border-red-500 px-3 py-1 text-gray-300 border-gray-600"
                      onClick={() => {
                        setSearchQuery(search)
                        handleSearch(search)
                      }}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-1 mb-6 sm:mb-8">
              <TabsTrigger
                value="discover"
                className="rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 text-sm sm:text-base"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Discover
              </TabsTrigger>
              <TabsTrigger
                value="trending"
                className="rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 text-sm sm:text-base"
              >
                <Flame className="w-4 h-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger
                value="results"
                className="rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-300 text-sm sm:text-base"
              >
                <Search className="w-4 h-4 mr-2" />
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover">
              <div className="space-y-6 sm:space-y-8">
                {/* Popular Categories */}
                <Card className="border-0 shadow-lg bg-gray-900/80 backdrop-blur-md border border-gray-700">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                      <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                      Popular Categories
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3 sm:gap-4">
                      {POPULAR_CATEGORIES.map((category, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-red-900/30 to-pink-900/30 rounded-2xl p-3 sm:p-4 text-center cursor-pointer hover:from-red-800/40 hover:to-pink-800/40 transition-all duration-300 hover:scale-105 border border-red-800/30"
                          onClick={() => {
                            setSearchQuery(category.name.toLowerCase())
                            handleSearch(category.name.toLowerCase())
                          }}
                        >
                          <div className="text-2xl sm:text-3xl mb-2">{category.icon}</div>
                          <div className="font-semibold text-white mb-1 text-xs sm:text-sm">{category.name}</div>
                          <div className="text-xs text-gray-400">{category.count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Trending Hashtags */}
                <Card className="border-0 shadow-lg bg-gray-900/80 backdrop-blur-md border border-gray-700">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                      <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                      Trending Hashtags
                    </h2>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {TRENDING_HASHTAGS.map((hashtag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-red-600/20 hover:border-red-500 px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-gray-300 border-gray-600"
                          onClick={() => {
                            const searchTerm = hashtag.replace("#", "")
                            setSearchQuery(searchTerm)
                            handleSearch(searchTerm)
                          }}
                        >
                          {hashtag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trending">
              {loading ? (
                <div className="space-y-8">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-center">
                      <div className="w-full max-w-[400px] bg-gray-900 rounded-2xl overflow-hidden">
                        <Skeleton className="aspect-[9/16] bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : trendingVideos.length > 0 ? (
                renderVideoGrid(trendingVideos, true)
              ) : (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-3xl flex items-center justify-center">
                    <Flame className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No trending videos available</h3>
                  <p className="text-gray-400 max-w-md mx-auto text-sm sm:text-base">
                    Check your API configuration or try searching for specific topics.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="results">
              {loading ? (
                <div className="space-y-8">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-center">
                      <div className="w-full max-w-[400px] bg-gray-900 rounded-2xl overflow-hidden">
                        <Skeleton className="aspect-[9/16] bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (searchResults.shorts?.length || 0) + (searchResults.videos?.length || 0) === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-3xl flex items-center justify-center">
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No results found</h3>
                  <p className="text-gray-400 max-w-md mx-auto text-sm sm:text-base">
                    Try searching for popular topics like cricket, music, dance, comedy, or food.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      Search Results for &quot;{searchQuery}&quot;
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-base">
                      {(searchResults.shorts?.length || 0) + (searchResults.videos?.length || 0)} videos found
                    </p>
                  </div>

                  {/* YouTube Shorts Results */}
                  {searchResults.shorts && searchResults.shorts.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center justify-center gap-2">
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                        YouTube Shorts
                      </h3>
                      {renderVideoGrid(searchResults.shorts)}
                    </div>
                  )}

                  {/* Local Videos Results */}
                  {searchResults.videos && searchResults.videos.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center justify-center gap-2">
                        <Video className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                        More Videos
                      </h3>
                      {renderVideoGrid(searchResults.videos)}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
