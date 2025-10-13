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

  // Calculate head pose angles (pitch, yaw, roll) in degrees
  const calculateHeadPose = (landmarks: any): { pitch: number; yaw: number; roll: number } => {
    // Key facial landmarks for head pose
    const noseTip = landmarks[1];        // Nose tip
    const chin = landmarks[152];         // Chin
    const leftEye = landmarks[33];       // Left eye outer corner
    const rightEye = landmarks[263];     // Right eye outer corner
    const leftMouth = landmarks[61];     // Left mouth corner
    const rightMouth = landmarks[291];   // Right mouth corner
    
    // Calculate yaw (left-right rotation)
    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
      z: (leftEye.z + rightEye.z) / 2
    };
    const noseToEyeCenter = noseTip.x - eyeCenter.x;
    const yaw = Math.atan2(noseToEyeCenter, 0.1) * (180 / Math.PI);
    
    // Calculate pitch (up-down rotation)
    const noseToEyeY = noseTip.y - eyeCenter.y;
    const pitch = Math.atan2(noseToEyeY, 0.3) * (180 / Math.PI);
    
    // Calculate roll (head tilt to side)
    const eyeSlope = (rightEye.y - leftEye.y) / (rightEye.x - leftEye.x);
    const roll = Math.atan(eyeSlope) * (180 / Math.PI);
    
    return { pitch, yaw, roll };
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
          
          // Calculate head pose angles
          const headPose = calculateHeadPose(landmarks);
          
          // Calculate overall head alignment score (0-1) with very lenient thresholds
          // These are calibrated for normal screen viewing posture
          const pitchScore = Math.max(0, 1 - Math.abs(headPose.pitch) / 60);  // Allow ±60° 
          const yawScore = Math.max(0, 1 - Math.abs(headPose.yaw) / 70);      // Allow ±70° 
          const rollScore = Math.max(0, 1 - Math.abs(headPose.roll) / 50);    // Allow ±50° 
          const headAlignmentScore = (pitchScore + yawScore + rollScore) / 3;
          
          // Convert alignment score to focus percentage
          // More generous scaling: alignment 0.6+ should give 80%+ focus
          if (headAlignmentScore > 0.4) {
            // Map 0.4-1.0 to 50-95%
            currentFocus = Math.round(50 + (headAlignmentScore - 0.4) * 75);
          } else {
            // Map 0-0.4 to 25-50%
            currentFocus = Math.round(25 + headAlignmentScore * 62.5);
          }
          
          // Clamp to valid range
          currentFocus = Math.max(25, Math.min(95, currentFocus));
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
