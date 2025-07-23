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
  ExternalLink,
  Timer,
  Zap,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface YouTubeShort {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  duration: number;
  isShort: boolean;
  embedUrl: string;
  watchUrl: string;
}

interface LocalVideo {
  _id: string;
  title: string;
  description: string;
  videourl: string;
  thumbnailurl: string;
  username: string;
  likes: number;
  views: number;
  createdAt: string;
}

interface SearchResult {
  shorts: YouTubeShort[];
  videos: LocalVideo[];
  users: string[];
  hashtags: string[];
  totalResults: number;
  searchType: string;
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
]

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult>({
    shorts: [],
    videos: [],
    users: [],
    hashtags: [],
    totalResults: 0,
    searchType: "",
  })
  const [trendingShorts, setTrendingShorts] = useState<YouTubeShort[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("discover")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchTrendingShorts()
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

  const fetchTrendingShorts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/search?trending=true&limit=20")
      if (response.ok) {
        const data = await response.json()
        setTrendingShorts(Array.isArray(data.shorts) ? data.shorts : [])
      } else {
        setTrendingShorts([])
      }
    } catch (error) {
      console.error("Error fetching trending shorts:", error)
      setTrendingShorts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return

    try {
      setLoading(true)
      setActiveTab("results")
      saveRecentSearch(query)

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults({
          shorts: results.shorts || [],
          videos: results.videos || [],
          users: results.users || [],
          hashtags: results.hashtags || [],
          totalResults: results.totalResults || 0,
          searchType: results.searchType || "combined",
        })
      }
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults({
        shorts: [],
        videos: [],
        users: [],
        hashtags: [],
        totalResults: 0,
        searchType: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem("recentSearches")
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

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const renderYouTubeShort = (short: YouTubeShort, index?: number) => {
    return (
      <div
        key={short.videoId}
        className="relative w-full max-w-[400px] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* YouTube Embed */}
        <div className="relative aspect-[9/16] bg-black">
          <iframe
            src={`${short.embedUrl}?autoplay=0&mute=1&playsinline=1&controls=1&modestbranding=1&rel=0&showinfo=0`}
            title={short.title}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Video Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold leading-tight line-clamp-2">{short.title}</h3>
              <p className="text-sm text-gray-300">@{short.channelTitle}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(short.viewCount)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(short.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  <span>{formatDuration(short.duration)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking Badge */}
          {index !== undefined && (
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-red-600 text-white border-0 backdrop-blur-sm">
                <Flame className="w-3 h-3 mr-1" />#{index + 1}
              </Badge>
              <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm">
                <Zap className="w-3 h-3 mr-1" />Short
              </Badge>
            </div>
          )}

          {/* YouTube Link */}
          <div className="absolute top-4 right-4">
            <a
              href={short.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all backdrop-blur-sm"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10">
          {/* Like Button */}
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 rounded-full bg-black/50 text-white hover:bg-red-600/80 transition-all backdrop-blur-sm">
              <Heart className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">{formatNumber(short.likeCount)}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(short.watchUrl)
              // You could add a toast notification here
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 rounded-full bg-black/50 text-white hover:bg-green-600/80 transition-all backdrop-blur-sm">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">Share</span>
          </button>
        </div>
      </div>
    )
  }

  const renderLocalVideo = (video: LocalVideo, index?: number) => {
    return (
      <div
        key={video._id}
        className="relative w-full max-w-[400px] mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Local Video Player */}
        <div className="relative aspect-[9/16] bg-black">
          <video
            src={video.videourl}
            poster={video.thumbnailurl}
            className="w-full h-full object-cover"
            controls
            muted
            playsInline
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Video Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold leading-tight line-clamp-2">{video.title}</h3>
              <p className="text-sm text-gray-300">@{video.username}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(video.views)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(video.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Local Video Badge */}
          {index !== undefined && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-purple-600 text-white border-0 backdrop-blur-sm">
                <Video className="w-3 h-3 mr-1" />Local
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
            <span className="text-white text-xs font-medium">{formatNumber(video.likes)}</span>
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

  const renderVideoGrid = (shorts: YouTubeShort[], videos: LocalVideo[], showRanking = false) => {
    const allContent: Array<{ type: 'youtube' | 'local', data: YouTubeShort | LocalVideo, index: number }> = [
      ...shorts.map((short, index) => ({ type: 'youtube' as const, data: short, index })),
      ...videos.map((video, index) => ({ type: 'local' as const, data: video, index: shorts.length + index }))
    ]

    if (allContent.length === 0) return null

    return (
      <div className="space-y-8">
        {allContent.map((content, globalIndex) => (
          <div key={content.type === 'youtube' ? (content.data as YouTubeShort).videoId : (content.data as LocalVideo)._id} className="flex justify-center">
            {content.type === 'youtube' 
              ? renderYouTubeShort(content.data as YouTubeShort, showRanking ? globalIndex : undefined)
              : renderLocalVideo(content.data as LocalVideo, showRanking ? globalIndex : undefined)
            }
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <div className="ml-0 md:ml-64 lg:ml-72 xl:ml-80 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Search Header */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-700 p-6 sm:p-8 mb-6 sm:mb-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Discover Amazing Shorts</h1>
              </div>
              <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
                Find trending YouTube Shorts, discover new creators, and explore what&apos;s popular right now
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
                  placeholder="Search for cricket, football, music, dance..."
                  className="pl-12 pr-20 py-3 sm:py-4 text-base sm:text-lg bg-gray-800 border-gray-600 text-white rounded-xl focus:border-red-500 focus:ring-red-500 placeholder-gray-400"
                />
                <Button
                  onClick={() => handleSearch()}
                  disabled={!searchQuery.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2"
                >
                  Search
                </Button>
              </div>
            </div>

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
                <Card className="border-spacing-0 shadow-lg bg-gray-900/80 backdrop-blur-md border border-gray-700">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                      <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                      Popular Categories
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
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
                <Card className="border-spacing-0 shadow-lg bg-gray-900/80 backdrop-blur-md border border-gray-700">
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
                            setSearchQuery(hashtag)
                            handleSearch(hashtag)
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
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                      <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                      Trending YouTube Shorts
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-base">
                      {trendingShorts.length} trending shorts
                    </p>
                  </div>
                  {renderVideoGrid(trendingShorts, [], true)}
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
              ) : searchResults.totalResults === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-3xl flex items-center justify-center">
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No results found</h3>
                  <p className="text-gray-400 max-w-md mx-auto text-sm sm:text-base">
                    Try searching for cricket, football, music, or other popular topics.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      Search Results for &quot;{searchQuery}&quot;
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-base">
                      {searchResults.totalResults} videos found ({searchResults.shorts.length} YouTube Shorts, {searchResults.videos.length} Local Videos)
                    </p>
                  </div>

                  {/* Combined Results */}
                  {renderVideoGrid(searchResults.shorts, searchResults.videos)}

                  {/* Separate sections if you prefer */}
                  {/*
                  {searchResults.shorts.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                        YouTube Shorts ({searchResults.shorts.length})
                      </h3>
                      {renderVideoGrid(searchResults.shorts, [])}
                    </div>
                  )}

                  {searchResults.videos.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center justify-center gap-2">
                        <Video className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                        Local Videos ({searchResults.videos.length})
                      </h3>
                      {renderVideoGrid([], searchResults.videos)}
                    </div>
                  )}
                  */}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}