import { FileText, Video, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CollegeLecture, CollegeResource } from "@/lib/college/types";

const TYPE_LABELS: Record<CollegeResource["resource_type"], string> = {
  notes: "Notes",
  past_paper: "Past paper",
  slides: "Slides",
  other: "Other",
};

function toEmbedUrl(videoUrl: string): string {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : videoUrl;
    }
    if (host === "drive.google.com") return videoUrl.replace("/view", "/preview");
    return videoUrl;
  } catch {
    return videoUrl;
  }
}

export function CollegeDashboardTabs({
  lectures,
  resources,
}: {
  lectures: CollegeLecture[];
  resources: CollegeResource[];
}) {
  return (
    <Tabs defaultValue="lectures" className="w-full">
      <TabsList>
        <TabsTrigger value="lectures">Lectures ({lectures.length})</TabsTrigger>
        <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="lectures" className="mt-4">
        {lectures.length === 0 ? (
          <EmptyState icon={Video} title="No lectures added yet" description="Your college admin hasn't added any lectures yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {lectures.map((lecture) => (
              <div
                key={lecture.id}
                className="glass overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl"
              >
                <div className="aspect-video w-full bg-muted">
                  <iframe
                    src={toEmbedUrl(lecture.video_url)}
                    title={lecture.title}
                    loading="lazy"
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
                <div className="p-4">
                  <p className="font-medium">{lecture.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[lecture.course_name, lecture.semester].filter(Boolean).join(" · ")}
                  </p>
                  {lecture.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{lecture.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="resources" className="mt-4">
        {resources.length === 0 ? (
          <EmptyState icon={FileText} title="No resources yet" description="Your college admin hasn't added any resources yet." />
        ) : (
          <div className="space-y-3">
            {resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl transition-shadow hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{resource.title}</p>
                    <Badge variant="secondary">{TYPE_LABELS[resource.resource_type]}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[resource.course_name, resource.semester].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
