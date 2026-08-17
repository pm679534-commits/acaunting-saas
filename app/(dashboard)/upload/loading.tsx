import { Skeleton } from "@/components/ui/skeleton"

export default function UploadLoading() {
  return (
    <div>
      {/* PageHeader skeleton */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Dropzone skeleton */}
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
