import { useEffect, useRef, useState } from "react";

const PDF_JS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_JS_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

type PdfViewport = {
  width: number;
  height: number;
};

type PdfRenderTask = {
  promise: Promise<void>;
  cancel?: () => void;
};

type PdfPageProxy = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => PdfRenderTask;
  cleanup?: () => void;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy?: () => void;
};

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string) => { promise: Promise<PdfDocumentProxy> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

let pdfJsLoader: Promise<PdfJsLib> | null = null;

const loadPdfJs = async () => {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_CDN;
    return window.pdfjsLib;
  }

  if (!pdfJsLoader) {
    pdfJsLoader = new Promise<PdfJsLib>((resolve, reject) => {
      const existingScript = document.querySelector('script[data-pdfjs="agreement-preview"]') as HTMLScriptElement | null;

      const resolveLibrary = () => {
        if (!window.pdfjsLib) {
          reject(new Error("PDF-biblioteket kunde inte laddas."));
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_CDN;
        resolve(window.pdfjsLib);
      };

      if (existingScript) {
        if (window.pdfjsLib) {
          resolveLibrary();
          return;
        }
        existingScript.addEventListener("load", resolveLibrary, { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Kunde inte ladda PDF-biblioteket.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = PDF_JS_CDN;
      script.async = true;
      script.dataset.pdfjs = "agreement-preview";
      script.onload = resolveLibrary;
      script.onerror = () => reject(new Error("Kunde inte ladda PDF-biblioteket."));
      document.head.appendChild(script);
    });
  }

  return pdfJsLoader;
};

interface AgreementPdfPreviewProps {
  fileUrl: string | null;
}

const AgreementPdfPreview = ({ fileUrl }: AgreementPdfPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl || !containerRef.current) {
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    let activeDocument: PdfDocumentProxy | null = null;
    const container = containerRef.current;

    const renderPdf = async () => {
      setStatus("loading");
      setErrorMessage(null);
      container.innerHTML = "";

      try {
        const pdfjsLib = await loadPdfJs();
        if (cancelled || !containerRef.current) return;

        activeDocument = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled || !containerRef.current) return;

        const availableWidth = Math.max(320, containerRef.current.clientWidth - 16);

        for (let pageNumber = 1; pageNumber <= activeDocument.numPages; pageNumber += 1) {
          const page = await activeDocument.getPage(pageNumber);
          if (cancelled || !containerRef.current) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const scale = availableWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement("div");
          pageWrapper.className = "flex justify-center pb-4";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Kunde inte skapa canvas-kontekst.");
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "max-w-full rounded-md border bg-background shadow-sm";

          pageWrapper.appendChild(canvas);
          containerRef.current.appendChild(pageWrapper);

          const renderTask = page.render({
            canvasContext: context,
            viewport,
          });

          await renderTask.promise;
          page.cleanup?.();
        }

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(error instanceof Error ? error.message : "Kunde inte visa PDF-filen.");
          container.innerHTML = "";
        }
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
      container.innerHTML = "";
      activeDocument?.destroy?.();
    };
  }, [fileUrl]);

  return (
    <div className="h-full overflow-y-auto">
      {status === "loading" && (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Renderar PDF...
        </div>
      )}

      {status === "error" && (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">
          {errorMessage || "Kunde inte visa PDF-filen."}
        </div>
      )}

      <div
        ref={containerRef}
        className={status === "ready" ? "min-h-full py-2" : "hidden"}
      />
    </div>
  );
};

export default AgreementPdfPreview;
