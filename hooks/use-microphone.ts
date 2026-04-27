import { useCallback, useEffect, useState } from "react";

export type MicrophonePermissionState =
  | "idle"
  | "prompt"
  | "granted"
  | "denied"
  | "error";

export function useMicrophone() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<MicrophonePermissionState>("idle");
  const [isMicOn, setIsMicOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopMicrophone = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsMicOn(false);
  }, [stream]);

  const startMicrophone = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser.");
      setPermissionState("error");
      return;
    }

    setPermissionState("prompt");

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      setIsMicOn(true);
      setPermissionState("granted");
      setError(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setStream(null);
      setIsMicOn(false);
      setError(message);
      setPermissionState(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "denied"
          : "error",
      );
    }
  }, []);

  const toggleMicrophone = useCallback(() => {
    if (isMicOn) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  }, [isMicOn, startMicrophone, stopMicrophone]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    isMicOn,
    permissionState,
    error,
    startMicrophone,
    stopMicrophone,
    toggleMicrophone,
  };
}
