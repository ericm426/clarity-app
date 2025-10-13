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

  // Calculate Euclidean distance between two 3D points
  const calculateDistance = (p1: any, p2: any): number => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  };

  // Calculate Eye Aspect Ratio (EAR)
  // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
  const calculateEAR = (eye: any[]): number => {
    // Vertical distances
    const vertical1 = calculateDistance(eye[1], eye[5]);
    const vertical2 = calculateDistance(eye[2], eye[4]);
    
    // Horizontal distance
    const horizontal = calculateDistance(eye[0], eye[3]);
    
    // EAR formula
    return (vertical1 + vertical2) / (2.0 * horizontal);
  };

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
          
          // MediaPipe Face Mesh eye landmark indices
          // Left eye: 33 (left corner), 133 (right corner), 160, 159 (top), 144, 145 (bottom)
          const leftEyePoints = [
            landmarks[33],  // left corner
            landmarks[160], // top 1
            landmarks[159], // top 2
            landmarks[133], // right corner
            landmarks[145], // bottom 1
            landmarks[144]  // bottom 2
          ];
          
          // Right eye: 362 (right corner), 263 (left corner), 385, 387 (top), 373, 380 (bottom)
          const rightEyePoints = [
            landmarks[362], // right corner
            landmarks[385], // top 1
            landmarks[387], // top 2
            landmarks[263], // left corner
            landmarks[380], // bottom 1
            landmarks[373]  // bottom 2
          ];
          
          // Calculate EAR for both eyes
          const leftEAR = calculateEAR(leftEyePoints);
          const rightEAR = calculateEAR(rightEyePoints);
          const avgEAR = (leftEAR + rightEAR) / 2;
          
          // Calculate head pose (check if facing camera)
          const noseTip = landmarks[1];
          const faceCenter = landmarks[168];
          const headTilt = Math.abs(noseTip.x - faceCenter.x);
          
          // Classify focus based on EAR thresholds
          // EAR > 0.25 = fully open eyes (alert)
          // EAR 0.2-0.25 = partially open (drowsy)
          // EAR < 0.2 = closed/blinking
          if (avgEAR > 0.25 && headTilt < 0.1) {
            currentFocus = 95; // Fully engaged
          } else if (avgEAR > 0.20 && headTilt < 0.15) {
            currentFocus = 75; // Moderately focused
          } else if (avgEAR > 0.15) {
            currentFocus = 50; // Drowsy or looking away
          } else {
            currentFocus = 30; // Eyes closed or distracted
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
