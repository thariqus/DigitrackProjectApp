import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { JHScrapItem } from "@/types/JHDigitrack/JHScrapItem";

interface ScrapDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: JHScrapItem | null;
}

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-green-100 text-green-700",
  Sold: "bg-gray-100 text-gray-600",
  Inactive: "bg-red-100 text-red-600",
};

const formatDate = (date?: string) =>
  date ? format(new Date(date), "MMM dd, yyyy") : "-";

const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
    <span className="text-sm">{value ?? "-"}</span>
  </div>
);

function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Images ({index + 1} / {images.length})
      </span>

      <div className="relative overflow-hidden rounded-lg border bg-muted">
        <img
          src={images[index]}
          alt={`Image ${index + 1}`}
          className="w-full h-72 object-contain"
        />

        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow"
              onClick={prev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow"
              onClick={next}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        <a
          href={images[index]}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2"
        >
          <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-14 w-14 rounded border-2 overflow-hidden transition-all ${
                i === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={src} alt={`Thumb ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScrapDetailSheet({ open, onOpenChange, item }: ScrapDetailSheetProps) {
  const images = item ? [item.image1, item.image2, item.image3].filter(Boolean) as string[] : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full px-0 flex flex-col">
        <SheetHeader className="px-6 pb-2">
          {item && (
            <div className="flex items-start justify-between gap-3 pr-6">
              <SheetTitle className="text-xl font-semibold leading-tight">
                {item.item_name}
              </SheetTitle>
              <span
                className={`mt-0.5 shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? "bg-muted text-foreground"}`}
              >
                {item.status}
              </span>
            </div>
          )}
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          {item && (
            <div className="space-y-6 py-4 pb-8">

              <ImageCarousel images={images} />

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Quantity" value={item.quantity} />
                <Field label="Date" value={formatDate(item.date)} />
                <Field label="Location" value={item.location} />
                <Field label="Contact Details" value={item.contact_details} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Employee ID" value={item.employee_id} />
                <Field label="Employee Name" value={item.employee_name} />
              </div>

              {item.description && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Description
                    </span>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
                  </div>
                </>
              )}

            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default ScrapDetailSheet;
