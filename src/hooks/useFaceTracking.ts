import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface FaceTrackingState {
  isTracking: boolean;
  focusLevel: number;
  isFaceDetected: boolean;
}

export const useFaceTracking = () => {
  const [state, setState] = useState<FaceTrackingState>({
    isTracking: false,
    focusLevel: 100,
    isFaceDetected: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const focusHistoryRef = useRef<number[]>([]);

  const startTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await videoRef.current.play();

      setState((prev) => ({ ...prev, isTracking: true }));

      // Start face detection
      startDetection();

      toast.success('Focus tracking started', {
        description: 'Maintaining your attention...',
      });
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Camera access denied', {
        description: 'Please allow camera access to use focus tracking.',
      });
    }
  };

  const startDetection = () => {
    if (detectionIntervalRef.current) return;

    detectionIntervalRef.current = setInterval(() => {
      detectFace();
    }, 1000); // Check every second
  };

  const detectFace = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    // Simple brightness-based face detection
    // In a production app, you'd use a proper ML model
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalBrightness = 0;
    let pixelCount = 0;

    // Sample center region where face should be
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const sampleSize = 100;

    for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
      for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
        const i = (y * canvas.width + x) * 4;
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
        pixelCount++;
      }
    }

    const avgBrightness = totalBrightness / pixelCount;
    
    // Face detected if brightness is in human skin range (60-180)
    const faceDetected = avgBrightness > 60 && avgBrightness < 180;

    // Update focus level based on face detection
    const currentFocus = faceDetected ? 95 : 30;
    focusHistoryRef.current.push(currentFocus);

    // Keep last 30 seconds of history
    if (focusHistoryRef.current.length > 30) {
      focusHistoryRef.current.shift();
    }

    // Calculate average focus level
    const avgFocus = Math.round(
      focusHistoryRef.current.reduce((a, b) => a + b, 0) / focusHistoryRef.current.length
    );

    setState((prev) => ({
      ...prev,
      focusLevel: avgFocus,
      isFaceDetected: faceDetected,
    }));
  };

  const stopTracking = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    focusHistoryRef.current = [];

    setState({
      isTracking: false,
      focusLevel: 100,
      isFaceDetected: false,
    });

    toast.info('Focus tracking stopped');
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
};
