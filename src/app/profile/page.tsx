"use client"

import type React from "react"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Video,
  Heart,
  Eye,
  Calendar,
  Edit3,
  Share2,
  Grid3X3,
  Play,
  Settings,
  LogOut,
  Upload,
  MoreVertical,
  Trash2,
  ExternalLink,
  Star,
  Trophy,
  Sparkles,
  Clock,
  X,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { redirect } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface UserVideo {
  _id: string
  title: string
  description: string
  videourl: string
  thumbnailurl: string
  likes: number
  views: number
  createdAt: string
}

interface UserStats {
  totalVideos: number
  totalLikes: number
  totalViews: number
  joinedDate: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [userVideos, setUserVideos] = useState<UserVideo[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("videos")
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<UserVideo | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Add new state for profile data
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    image: undefined as string | undefined,
    bio: "",
  })

  // Update the editForm initialization
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    profileImage: undefined as string | undefined,
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    redirect("/login")
  }

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true)
      const videosResponse = await fetch(`/api/user/videos?email=${session?.user?.email}`)
      if (videosResponse.ok) {
        const videos = await videosResponse.json()
        setUserVideos(videos)

        const stats = {
          totalVideos: videos.length,
          totalLikes: videos.reduce((sum: number, video: UserVideo) => sum + (video.likes || 0), 0),
          totalViews: videos.reduce((sum: number, video: UserVideo) => sum + (video.views || 0), 0),
          joinedDate: videos.length > 0 ? videos[videos.length - 1].createdAt : new Date().toISOString(),
        }
        setUserStats(stats)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast.error("Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }, [session?.user?.email])

  const fetchProfileData = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const data = await response.json()
        const profile = {
          name: data.profile.name || "",
          email: data.profile.email || "",
          image: data.profile.image || undefined,
          bio: data.profile.bio || "",
        }
        setProfileData(profile)
        setEditForm({
          name: profile.name,
          bio: profile.bio,
          profileImage: profile.image,
        })
      } else {
        // If API fails, use session data
        if (session?.user) {
          const fallbackProfile = {
            name: session.user.name || "",
            email: session.user.email || "",
            image: session.user.image || undefined,
            bio: "",
          }
          setProfileData(fallbackProfile)
          setEditForm({
            name: fallbackProfile.name,
            bio: fallbackProfile.bio,
            profileImage: fallbackProfile.image,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      // Fallback to session data if API fails
      if (session?.user) {
        const fallbackProfile = {
          name: session.user.name || "",
          email: session.user.email || "",
          image: session.user.image || undefined,
          bio: "",
        }
        setProfileData(fallbackProfile)
        setEditForm({
          name: fallbackProfile.name,
          bio: fallbackProfile.bio,
          profileImage: fallbackProfile.image,
        })
      }
    }
  }, [session])

  // Update the useEffect to only call fetchProfileData
  useEffect(() => {
    if (session?.user?.email) {
      fetchUserData()
      fetchProfileData()
    }
  }, [session?.user?.email, fetchUserData, fetchProfileData])

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut({ callbackUrl: "/" })
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out")
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleEditProfile = () => {
    setEditForm({
      name: profileData.name,
      bio: profileData.bio,
      profileImage: profileData.image,
    })
    setIsEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          bio: editForm.bio.trim(),
          image: editForm.profileImage,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      await response.json()

      // Update the local profile data immediately
      const updatedProfile = {
        name: editForm.name.trim(),
        email: profileData.email,
        image: editForm.profileImage,
        bio: editForm.bio.trim(),
      }
      setProfileData(updatedProfile)

      toast.success("Profile updated successfully!")
      setIsEditingProfile(false)

      // Optionally refresh the page to update session data
      // window.location.reload()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB")
      return
    }

    try {
      setUploadingImage(true)

      // Create a preview URL
      const imageUrl = URL.createObjectURL(file)
      setEditForm((prev) => ({ ...prev, profileImage: imageUrl }))

      // Here you would typically upload to your backend/cloud storage
      // For demo purposes, we'll just use the local URL
      toast.success("Profile picture updated!")
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleShareProfile = async () => {
    try {
      const profileUrl = `${window.location.origin}/profile/${profileData.email}`
      if (navigator.share) {
        await navigator.share({
          title: `${profileData.name || "User"}'s Profile`,
          url: profileUrl,
        })
      } else {
        await navigator.clipboard.writeText(profileUrl)
        toast.success("Profile link copied to clipboard!")
      }
    } catch (error) {
      console.error("Error sharing profile:", error)
    }
  }

  const handleVideoClick = (video: UserVideo) => {
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

  if (status === "loading" || loading) {
    return <ProfileSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-x-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-200/15 to-blue-200/15 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main Content - Properly positioned to avoid sidebar */}
      <div className="relative z-10 ml-0 md:ml-64 lg:ml-72 xl:ml-80 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Profile Header */}
          <div className="relative mb-8 sm:mb-12">
            {/* Cover Background */}
            <div className="relative h-48 sm:h-56 lg:h-64 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 via-transparent to-transparent"></div>

              {/* Decorative elements */}
              <div className="absolute top-8 right-8 opacity-20">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div className="absolute top-16 right-24 opacity-25">
                <Star className="w-6 h-6 text-white animate-pulse delay-500" />
              </div>
              <div className="absolute bottom-12 right-12 opacity-20">
                <Trophy className="w-10 h-10 text-white animate-pulse delay-1000" />
              </div>

              {/* Action Buttons */}
              <div className="absolute top-6 right-6 flex gap-3 z-20">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShareProfile}
                  className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 transition-all duration-300 text-sm"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 transition-all duration-300"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-md border-white/20">
                    <DropdownMenuItem className="hover:bg-blue-50/80 text-sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEditProfile} className="hover:bg-blue-50/80 text-sm">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="text-red-600 focus:text-red-600 hover:bg-red-50/80 text-sm"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {isSigningOut ? "Signing out..." : "Sign Out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Profile Info Card */}
            <Card className="relative -mt-20 sm:-mt-24 mx-4 sm:mx-8 bg-white/90 backdrop-blur-xl border-0 shadow-lg rounded-2xl">
              <CardContent className="p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="relative">
                      <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-white shadow-lg bg-white">
                        <AvatarImage src={profileData.image || undefined} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-400 text-white text-3xl sm:text-4xl font-bold">
                          {profileData.name?.[0] || profileData.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="sm"
                        onClick={handleEditProfile}
                        className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 shadow-md border-2 border-white transition-all duration-300 hover:scale-110"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-center lg:text-left min-w-0">
                    <div className="mb-6">
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight mb-3">
                        {profileData.name || "Anonymous User"}
                      </h1>
                      <p className="text-gray-600 text-lg mb-4 break-all">{profileData.email}</p>

                      {/* Badges */}
                      <div className="flex gap-2 justify-center lg:justify-start flex-wrap mb-6">
                        <Badge className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white border-0 px-3 py-1">
                          <User className="w-3 h-3 mr-1" />
                          Creator
                        </Badge>
                        {userStats && userStats.totalVideos >= 10 && (
                          <Badge className="bg-gradient-to-r from-indigo-400 to-purple-400 text-white border-0 px-3 py-1">
                            <Trophy className="w-3 h-3 mr-1" />
                            Active Creator
                          </Badge>
                        )}
                        {userStats && userStats.totalLikes >= 1000 && (
                          <Badge className="bg-gradient-to-r from-purple-400 to-pink-400 text-white border-0 px-3 py-1">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    {userStats && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 text-center border border-blue-100">
                          <div className="text-2xl lg:text-3xl font-bold text-blue-600 mb-1">
                            {formatNumber(userStats.totalVideos)}
                          </div>
                          <div className="text-sm text-blue-600/80 uppercase tracking-wide font-medium">Videos</div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 text-center border border-indigo-100">
                          <div className="text-2xl lg:text-3xl font-bold text-indigo-600 mb-1">
                            {formatNumber(userStats.totalLikes)}
                          </div>
                          <div className="text-sm text-indigo-600/80 uppercase tracking-wide font-medium">Likes</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center border border-purple-100">
                          <div className="text-2xl lg:text-3xl font-bold text-purple-600 mb-1">
                            {formatNumber(userStats.totalViews)}
                          </div>
                          <div className="text-sm text-purple-600/80 uppercase tracking-wide font-medium">Views</div>
                        </div>
                        <div className="bg-gradient-to-br from-pink-50 to-blue-50 rounded-2xl p-4 text-center border border-pink-100">
                          <div className="text-2xl lg:text-3xl font-bold text-pink-600 mb-1">
                            {new Date(userStats.joinedDate).getFullYear()}
                          </div>
                          <div className="text-sm text-pink-600/80 uppercase tracking-wide font-medium">Joined</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-1 mb-8 shadow-md">
              <TabsTrigger
                value="videos"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-400 data-[state=active]:to-indigo-400 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 text-sm"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Videos</span>
                <span className="sm:hidden">({userVideos.length})</span>
                <span className="hidden sm:inline"> ({userVideos.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="liked"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-400 data-[state=active]:to-purple-400 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 text-sm"
              >
                <Heart className="w-4 h-4 mr-2" />
                Liked
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-400 data-[state=active]:to-pink-400 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 text-sm"
              >
                <User className="w-4 h-4 mr-2" />
                About
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="mt-0">
              {userVideos.length === 0 ? (
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-xl rounded-2xl">
                  <CardContent className="text-center py-16 sm:py-20">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-2xl flex items-center justify-center shadow-lg">
                      <Video className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">No videos yet</h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                      Start creating amazing content and share it with the world!
                    </p>
                    <Button className="bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Your First Video
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex justify-center">
                  <div className="w-full max-w-5xl">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 justify-items-center">
                      {userVideos.map((video) => (
                        <Card
                          key={video._id}
                          className="group overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/90 backdrop-blur-xl rounded-xl w-full max-w-[180px] cursor-pointer"
                          onClick={() => handleVideoClick(video)}
                        >
                          <div className="relative aspect-[9/16] overflow-hidden">
                            <video
                              src={video.videourl}
                              poster={video.thumbnailurl}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              muted
                              playsInline
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-sm">
                                <Play className="w-6 h-6 text-blue-600 ml-0.5" />
                              </div>
                            </div>

                            {/* Video overlay info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                              <h4 className="font-medium text-white text-xs mb-1.5 line-clamp-2 leading-tight">
                                {video.title}
                              </h4>
                              <div className="flex items-center justify-between text-white/90 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    <span>{formatNumber(video.likes || 0)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    <span>{formatNumber(video.views || 0)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-xs">{formatDate(video.createdAt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action menu */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white border-0 p-0 shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="w-3 h-3 text-gray-600" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-md w-36">
                                  <DropdownMenuItem className="text-sm hover:bg-blue-50">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-sm hover:bg-blue-50">
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600 text-sm hover:bg-red-50">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="liked" className="mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-xl rounded-2xl">
                <CardContent className="text-center py-16 sm:py-20">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center shadow-lg">
                    <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">No liked videos yet</h3>
                  <p className="text-gray-600 max-w-md mx-auto text-lg">
                    Start exploring and liking videos that inspire you!
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about" className="mt-0">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-xl rounded-2xl">
                <CardContent className="p-8 lg:p-10">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                        About Me
                      </h3>
                      <p className="text-gray-700 leading-relaxed text-lg">
                        {profileData.bio ||
                          "Welcome to my Shorts profile! I'm passionate about creating and sharing amazing video content. Join me on this creative journey and let's make something incredible together."}
                      </p>
                    </div>

                    {userStats && (
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-6">Journey Highlights</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-2xl flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <div className="text-sm text-blue-600 font-medium">Member since</div>
                                <div className="font-bold text-blue-700 text-lg">
                                  {new Date(userStats.joinedDate).toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center">
                                <Video className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <div className="text-sm text-purple-600 font-medium">Content created</div>
                                <div className="font-bold text-purple-700 text-lg">{userStats.totalVideos} videos</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md mx-auto">
            <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl">
              <video
                src={selectedVideo.videourl}
                poster={selectedVideo.thumbnailurl}
                className="w-full h-full object-cover"
                controls
                autoPlay
                playsInline
              />

              {/* Close button */}
              <Button
                onClick={closeVideoModal}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white border-0 p-0 backdrop-blur-sm z-10 shadow-lg"
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Fallback close button for better visibility */}
              <Button
                onClick={closeVideoModal}
                className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 border-0 p-0 shadow-lg z-10 md:hidden"
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Video info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">{selectedVideo.title}</h3>
                <div className="flex items-center justify-between text-white/90 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{formatNumber(selectedVideo.likes || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{formatNumber(selectedVideo.views || 0)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(selectedVideo.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md mx-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Edit Profile
                </h2>
                <Button
                  onClick={() => setIsEditingProfile(false)}
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 rounded-full p-0 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                      <AvatarImage src={editForm.profileImage || undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-400 text-white text-2xl font-bold">
                        {editForm.name?.[0] || profileData.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="profile-image-upload"
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 rounded-full flex items-center justify-center cursor-pointer shadow-md border-2 border-white transition-all duration-300 hover:scale-110"
                    >
                      {uploadingImage ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3 text-white" />
                      )}
                    </label>
                    <input
                      id="profile-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Click the upload icon to change your profile picture
                  </p>
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your display name"
                  />
                </div>

                {/* Bio Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setIsEditingProfile(false)}
                    variant="outline"
                    className="flex-1 py-3 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="ml-0 md:ml-64 lg:ml-72 xl:ml-80 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header Skeleton */}
          <div className="relative mb-8 sm:mb-12">
            <Skeleton className="h-48 sm:h-56 lg:h-64 rounded-2xl" />
            <Card className="relative -mt-20 sm:-mt-24 mx-4 sm:mx-8 bg-white/90 backdrop-blur-xl border-0 shadow-lg rounded-2xl">
              <CardContent className="p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
                  <Skeleton className="w-28 h-28 sm:w-32 sm:h-32 rounded-full" />
                  <div className="flex-1 space-y-4 text-center lg:text-left">
                    <Skeleton className="h-8 w-64 mx-auto lg:mx-0" />
                    <Skeleton className="h-4 w-48 mx-auto lg:mx-0" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-2xl" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Skeleton */}
          <Skeleton className="h-12 w-full rounded-2xl mb-8" />
          <div className="flex justify-center">
            <div className="w-full max-w-5xl">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 justify-items-center">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/16] rounded-xl w-full max-w-[180px]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
