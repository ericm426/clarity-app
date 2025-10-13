import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

interface FaceTrackingState {
  isTracking: boolean;
  focusLevel: number;
  isFaceDetected: boolean;
  stream: MediaStream | null;
}

export const useFaceTracking = () => {
  const [state, setState] = useState<FaceTrackingState>({
    isTracking: false,
    focusLevel: 100,
    isFaceDetected: false,
    stream: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const focusHistoryRef = useRef<number[]>([]);
  const lastDetectionTimeRef = useRef<number>(Date.now());

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

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await videoRef.current.play();

      // Initialize MediaPipe Face Mesh
      const faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        const faceDetected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
        
        // Calculate focus level based on face detection and facial metrics
        let currentFocus = 30; // Default low focus when no face
        
        if (faceDetected) {
          const landmarks = results.multiFaceLandmarks[0];
          
          // Get eye landmarks (left eye: 33, right eye: 263)
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          
          // Calculate eye openness (vertical distance between upper and lower eyelid)
          const leftEyeOpenness = Math.abs(landmarks[159].y - landmarks[145].y);
          const rightEyeOpenness = Math.abs(landmarks[386].y - landmarks[374].y);
          const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
          
          // Calculate head pose (check if facing camera)
          const noseTip = landmarks[1];
          const faceCenter = landmarks[168];
          const headTilt = Math.abs(noseTip.x - faceCenter.x);
          
          // Eyes open and facing camera = high focus
          if (avgEyeOpenness > 0.015 && headTilt < 0.1) {
            currentFocus = 95;
          } else if (avgEyeOpenness > 0.01) {
            currentFocus = 70; // Eyes open but not fully engaged
          } else {
            currentFocus = 40; // Eyes closed or looking away
          }
        }
        
        focusHistoryRef.current.push(currentFocus);

        // Keep last 5 seconds of history (assuming ~30fps = ~150 samples for 5s)
        if (focusHistoryRef.current.length > 150) {
          focusHistoryRef.current.shift();
        }

        // Calculate average focus level
        const avgFocus = Math.round(
          focusHistoryRef.current.reduce((a, b) => a + b, 0) / focusHistoryRef.current.length
        );

        lastDetectionTimeRef.current = Date.now();

        setState((prev) => ({
          ...prev,
          focusLevel: avgFocus,
          isFaceDetected: faceDetected,
        }));
      });

      faceMeshRef.current = faceMesh;

      // Initialize camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;

      setState((prev) => ({ ...prev, isTracking: true, stream }));

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


  const stopTracking = () => {
    // Stop camera
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    // Close face mesh
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    focusHistoryRef.current = [];

    setState({
      isTracking: false,
      focusLevel: 100,
      isFaceDetected: false,
      stream: null,
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
