import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

type UseQrCameraScannerOptions = {
  autoStart?: boolean;
  stopAfterScan?: boolean;
  onScan: (text: string) => void | Promise<void>;
};

type CameraConstraints = MediaTrackConstraints;

function canUseCamera(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function getCameraErrorMessage(error: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    const host = window.location.host;
    return `Camera requires HTTPS on mobile. Open https://${host} instead of http://.`;
  }

  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  if (/secure origin|secure context|Only secure origins/i.test(message)) {
    const host =
      typeof window !== "undefined" ? window.location.host : "YOUR-IP:5173";
    return `Camera requires HTTPS on mobile. Open https://${host} instead of http://.`;
  }
  if (/NotAllowedError|Permission denied/i.test(message)) {
    return "Please allow camera access in your browser settings.";
  }
  if (/NotFoundError|Requested device not found/i.test(message)) {
    return "No camera was found on this device.";
  }
  if (/NotReadableError|TrackStartError|in use/i.test(message)) {
    return "Camera is busy. Close other apps using the camera and try again.";
  }

  return "Unable to open camera.";
}

function buildCameraConstraints(): CameraConstraints[] {
  return [
    { facingMode: { ideal: "environment" } },
    { facingMode: "environment" },
    { facingMode: { ideal: "user" } },
    { facingMode: "user" },
  ];
}

export function useQrCameraScanner({
  autoStart = false,
  stopAfterScan = true,
  onScan,
}: UseQrCameraScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const scannedSetRef = useRef(new Set<string>());
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const scannerReleaseRef = useRef<Promise<void>>(Promise.resolve());
  const [errorScan, setErrorScan] = useState(() =>
    autoStart && !canUseCamera()
      ? getCameraErrorMessage(new Error("insecure context"))
      : "",
  );
  const [isScanning, setIsScanning] = useState(
    () => autoStart && canUseCamera(),
  );
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    return () => {
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, []);

  const handleCloseScanner = useCallback(() => {
    const release = (async () => {
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
      setIsScanning(false);
      setErrorScan("");
    })();
    scannerReleaseRef.current = release;
    void release;
  }, []);

  const handleOpenScanner = useCallback(() => {
    if (!canUseCamera()) {
      setErrorScan(getCameraErrorMessage(new Error("insecure context")));
      setIsScanning(false);
      return;
    }

    scannedSetRef.current.clear();
    setErrorScan("");
    setIsScanning(true);

    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isScanning || !videoElement) return;

    let cancelled = false;

    void (async () => {
      await scannerReleaseRef.current;
      if (cancelled) return;

      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;

      await new Promise((resolve) => window.setTimeout(resolve, 200));
      if (cancelled) return;

      const codeReader = new BrowserQRCodeReader();
      const constraintOptions = buildCameraConstraints();
      let lastError: unknown;

      for (const video of constraintOptions) {
        if (cancelled) return;

        try {
          const controls = await codeReader.decodeFromConstraints(
            { video },
            videoElement,
            (result) => {
              if (cancelled || !result) return;

              const qrText = result.getText();
              if (scannedSetRef.current.has(qrText)) return;

              scannedSetRef.current.add(qrText);

              if (stopAfterScan) {
                cancelled = true;
                scannerControlsRef.current?.stop();
                scannerControlsRef.current = null;
                setIsScanning(false);
                setErrorScan("");
              } else {
                window.setTimeout(() => {
                  scannedSetRef.current.delete(qrText);
                }, 2000);
              }

              void onScanRef.current(qrText);
            },
          );

          if (cancelled) {
            controls.stop();
            return;
          }

          scannerControlsRef.current = controls;
          setErrorScan("");
          return;
        } catch (error) {
          lastError = error;
          scannerControlsRef.current?.stop();
          scannerControlsRef.current = null;
        }
      }

      if (!cancelled) {
        console.error("Failed to start QR scanner:", lastError);
        setErrorScan(getCameraErrorMessage(lastError));
      }
    })();

    return () => {
      cancelled = true;
      const release = (async () => {
        scannerControlsRef.current?.stop();
        scannerControlsRef.current = null;
      })();
      scannerReleaseRef.current = release;
      void release;
    };
  }, [isScanning, stopAfterScan, videoElement]);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoElement(node);
  }, []);

  return {
    videoRef,
    setVideoRef,
    errorScan,
    isScanning,
    handleOpenScanner,
    handleCloseScanner,
  };
}
