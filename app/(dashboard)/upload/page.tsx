import { PageHeader } from "@/components/layout/page-header"
import { Dropzone } from "@/components/upload/dropzone"

export default function UploadPage() {
  return (
    <div>
      <PageHeader
        title="Sənəd yüklə"
        description="Faktura və ya qəbzinizi yükləyin, AI məlumatları avtomatik çıxarsın"
      />
      <Dropzone />
    </div>
  )
}
