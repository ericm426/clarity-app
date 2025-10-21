import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

interface FaceTrackingState {
  isTracking: boolean;
  focusLevel: number;
  isFaceDetected: boolean;
  stream: MediaStream | null;
  distractionCount: number; // Number of times distraction sound has played
  attentionMetrics: {
    eyeOpenness: number;
    headPoseScore: number;
    isDistracted: boolean;
    distractionDuration: number; // seconds
  };
}

interface AttentionMetrics {
  faceDetected: boolean;
  eyeOpenness: number;
  headPoseAngle: number; // degrees from center
  eyesOpen: boolean;
  windowFocused: boolean;
  faceConfidence: number;
}

export const useFaceTracking = () => {
  const [state, setState] = useState<FaceTrackingState>({
    isTracking: false,
    focusLevel: 100,
    isFaceDetected: false,
    stream: null,
    distractionCount: 0,
    attentionMetrics: {
      eyeOpenness: 0,
      headPoseScore: 0,
      isDistracted: false,
      distractionDuration: 0,
    },
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const focusHistoryRef = useRef<number[]>([]);
  const lastDetectionTimeRef = useRef<number>(Date.now());
  const distractionStartTimeRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const [windowFocused, setWindowFocused] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSoundPlayedRef = useRef<number>(0);

  // Play distraction alert sound and increment distraction count
  const playDistractionSound = (): boolean => {
    // Prevent sound spam - only play once every 5 seconds
    const now = Date.now();
    if (now - lastSoundPlayedRef.current < 5000) {
      return false; // Sound was not played (cooldown)
    }
    lastSoundPlayedRef.current = now;

    try {
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Create a gentle, subtle notification sound (not harsh)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime); // A5 note

      // Fade in and out for a softer sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05); // Fade in
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); // Fade out

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      // Increment distraction count
      setState((prev) => ({
        ...prev,
        distractionCount: prev.distractionCount + 1,
      }));

      return true; // Sound was successfully played
    } catch (error) {
      console.error('Error playing distraction sound:', error);
      return false;
    }
  };

  // Calculate enhanced attention score
  const calculateAttentionScore = (metrics: AttentionMetrics): number => {
    let score = 0;

    // Face detection (40 points)
    if (metrics.faceDetected) {
      score += 40;
    }

    // Face confidence (15 points)
    score += metrics.faceConfidence * 15;

    // Head pose - looking straight at screen (30 points) - STRICT THRESHOLDS
    if (metrics.headPoseAngle < 15) {
      score += 30; // Looking straight
    } else if (metrics.headPoseAngle < 25) {
      score += 20; // Slight tilt
    } else if (metrics.headPoseAngle < 35) {
      score += 10; // Moderate tilt - still somewhat focused
    } else if (metrics.headPoseAngle < 45) {
      score += 5; // Looking away - distracted
    }
    // >45 degrees = 0 points (clearly not looking at screen)

    // Eyes open (10 points)
    if (metrics.eyesOpen) {
      score += 10;
    }

    // Window focused (5 points)
    if (metrics.windowFocused) {
      score += 5;
    }

    // Debug logging
    if (Math.random() < 0.1) {
      console.log('Attention Score Debug:', {
        total: score,
        faceDetected: metrics.faceDetected ? 40 : 0,
        headPoseAngle: metrics.headPoseAngle.toFixed(2),
        eyesOpen: metrics.eyesOpen ? 10 : 0,
      });
    }

    return Math.min(100, Math.max(0, score));
  };

  // Calculate head pose angle from facial landmarks
  const calculateHeadPose = (landmarks: any[]): number => {
    // Key landmarks for head pose estimation
    const noseTip = landmarks[1];
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    // Calculate face dimensions for normalization
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
    const faceHeight = Math.abs(forehead.y - chin.y);

    // HORIZONTAL DEVIATION (YAW) - looking left/right
    // When looking straight: nose is centered between cheeks
    const leftDistance = Math.abs(noseTip.x - leftCheek.x);
    const rightDistance = Math.abs(noseTip.x - rightCheek.x);
    const yawRatio = Math.abs(leftDistance - rightDistance) / faceWidth;
    const yawAngle = Math.min(45, yawRatio * 180); // 0-45 degrees

    // VERTICAL DEVIATION (PITCH) - looking up/down
    // Method 1: Nose position relative to eyes
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const noseToEyeDistance = noseTip.y - eyeCenterY;
    const normalizedNosePosition = noseToEyeDistance / faceHeight;

    // Based on your debug output: normalizedNosePos is ~0.24-0.30 when looking straight
    // ASYMMETRIC DETECTION: Looking DOWN should have more penalty than looking UP
    const BASELINE_NOSE_POS = 0.25;
    const deviation = normalizedNosePosition - BASELINE_NOSE_POS;

    let pitchRatio1: number;
    if (deviation > 0.03) {
      // Looking DOWN (nose moves down relative to eyes) - STRICT
      const downDeviation = deviation - 0.03;
      pitchRatio1 = downDeviation / 0.10; // Very sensitive to downward gaze (2.5x more sensitive)
    } else if (deviation < -0.03) {
      // Looking UP (nose moves up relative to eyes) - LENIENT
      const upDeviation = Math.abs(deviation) - 0.03;
      pitchRatio1 = upDeviation / 0.20; // Less sensitive to upward gaze
    } else {
      // Within tolerance - looking straight
      pitchRatio1 = 0;
    }

    // Method 2: Eye distance to chin distance (better than aspect ratio)
    // This avoids the forehead landmark which seems unreliable
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
    );
    const chinToEyeDistance = Math.sqrt(
      Math.pow(chin.x - (leftEye.x + rightEye.x) / 2, 2) +
      Math.pow(chin.y - eyeCenterY, 2)
    );
    const chinEyeRatio = chinToEyeDistance / eyeDistance;

    // Based on YOUR actual data: chinEyeRatio is ~1.6-1.64 when looking straight
    // ASYMMETRIC: When looking down, chin distance increases (ratio goes up)
    const BASELINE_CHIN_RATIO = 1.62;
    const chinDeviation = chinEyeRatio - BASELINE_CHIN_RATIO;

    let pitchRatio2: number;
    if (chinDeviation > 0.06) {
      // Looking DOWN (chin distance increases) - STRICT
      const downDeviation = chinDeviation - 0.06;
      pitchRatio2 = downDeviation / 0.20; // Very sensitive to downward
    } else if (chinDeviation < -0.06) {
      // Looking UP (chin distance decreases) - LENIENT
      const upDeviation = Math.abs(chinDeviation) - 0.06;
      pitchRatio2 = upDeviation / 0.40; // Less sensitive to upward
    } else {
      // Within tolerance
      pitchRatio2 = 0;
    }

    // Combine both pitch detection methods (weighted average - favor nose position more)
    const pitchRatio = (pitchRatio1 * 0.8 + pitchRatio2 * 0.2);
    const pitchAngle = Math.min(50, pitchRatio * 100); // Increased max angle and sensitivity

    // COMBINED HEAD POSE ANGLE
    // Use Euclidean distance to combine yaw and pitch
    const combinedAngle = Math.sqrt(yawAngle * yawAngle + pitchAngle * pitchAngle);

    // Debug logging (remove after tuning)
    if (Math.random() < 0.1) { // Log 10% of frames to avoid spam
      const lookingDirection =
        deviation > 0.03 ? 'DOWN' :
        deviation < -0.03 ? 'UP' :
        'STRAIGHT';

      console.log('Head Pose Debug:', {
        direction: lookingDirection,
        yawAngle: yawAngle.toFixed(2),
        pitchAngle: pitchAngle.toFixed(2),
        combinedAngle: combinedAngle.toFixed(2),
        normalizedNosePos: normalizedNosePosition.toFixed(3),
        noseDeviation: deviation.toFixed(3),
        chinEyeRatio: chinEyeRatio.toFixed(3),
        chinDeviation: (chinEyeRatio - BASELINE_CHIN_RATIO).toFixed(3),
        pitchRatio1: pitchRatio1.toFixed(3),
        pitchRatio2: pitchRatio2.toFixed(3),
      });
    }

    return Math.min(90, combinedAngle);
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
        videoRef.current.muted = true;
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      // Wait for video metadata to load
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded:', {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            });
            resolve();
          };
        }
      });

      await videoRef.current.play();
      console.log('Video playing:', videoRef.current.readyState);

      // Initialize MediaPipe Face Mesh
      console.log('Initializing MediaPipe Face Mesh...');
      const faceMesh = new FaceMesh({
        locateFile: (file) => {
          const url = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          console.log('Loading MediaPipe file:', url);
          return url;
        },
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      console.log('MediaPipe Face Mesh configured');

      faceMesh.onResults((results) => {
        // Performance optimization: Process every 3rd frame (~10fps instead of 30fps)
        frameCountRef.current++;
        if (frameCountRef.current % 3 !== 0) {
          return;
        }

        const faceDetected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;

        // Debug: Log face detection results occasionally
        if (frameCountRef.current % 30 === 0) {
          console.log('Face Detection:', {
            faceDetected,
            landmarksCount: results.multiFaceLandmarks?.length || 0,
            frameCount: frameCountRef.current
          });
        }

        let currentFocus = 0; // Default low focus when no face
        let eyeOpenness = 0;
        let headPoseAngle = 90;
        let eyesOpen = false;
        const faceConfidence = faceDetected ? 1 : 0;

        if (faceDetected) {
          const landmarks = results.multiFaceLandmarks[0];

          // Calculate face size (distance between eyes) for normalization
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) +
            Math.pow(rightEye.y - leftEye.y, 2)
          );

          // Calculate eye openness normalized by face size
          const leftEyeOpenness = Math.abs(landmarks[159].y - landmarks[145].y) / eyeDistance;
          const rightEyeOpenness = Math.abs(landmarks[386].y - landmarks[374].y) / eyeDistance;
          const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

          eyeOpenness = avgEyeOpenness;
          eyesOpen = avgEyeOpenness > 0.05;

          // Calculate head pose using the new function
          headPoseAngle = calculateHeadPose(landmarks);

          // Use enhanced attention scoring
          const attentionMetrics: AttentionMetrics = {
            faceDetected: true,
            eyeOpenness: avgEyeOpenness,
            headPoseAngle,
            eyesOpen,
            windowFocused,
            faceConfidence,
          };

          currentFocus = calculateAttentionScore(attentionMetrics);
        }

        focusHistoryRef.current.push(currentFocus);

        // Keep last 1.5 seconds of history (at ~10fps = ~15 samples for 1.5s)
        // This makes the score more responsive to changes
        if (focusHistoryRef.current.length > 15) {
          focusHistoryRef.current.shift();
        }

        // Calculate smoothed average focus level with weighted average
        // Give more weight to recent frames for faster response
        let weightedSum = 0;
        let weightSum = 0;
        for (let i = 0; i < focusHistoryRef.current.length; i++) {
          const weight = i + 1; // More recent frames have higher weight
          weightedSum += focusHistoryRef.current[i] * weight;
          weightSum += weight;
        }
        const avgFocus = Math.round(weightedSum / weightSum);

        // Track distraction duration - use SMOOTHED score to match what user sees
        const DISTRACTION_THRESHOLD = 65; // Below 50% = distracted
        let distractionDuration = 0;

        if (avgFocus < DISTRACTION_THRESHOLD) {
          if (distractionStartTimeRef.current === null) {
            distractionStartTimeRef.current = Date.now();
            // Play sound when distraction is first detected (based on smoothed score)
            playDistractionSound();
            
          }
          distractionDuration = (Date.now() - distractionStartTimeRef.current) / 1000;
        } else {
          distractionStartTimeRef.current = null;
        }

        lastDetectionTimeRef.current = Date.now();

        setState((prev) => ({
          ...prev,
          focusLevel: avgFocus,
          isFaceDetected: faceDetected,
          attentionMetrics: {
            eyeOpenness: Math.round(eyeOpenness * 100) / 100,
            headPoseScore: Math.round((90 - headPoseAngle) / 90 * 100), // Convert angle to score (0-100)
            isDistracted: currentFocus < DISTRACTION_THRESHOLD,
            distractionDuration: Math.round(distractionDuration),
          },
        }));
      });

      faceMeshRef.current = faceMesh;

      // Initialize camera
      console.log('Initializing MediaPipe Camera...');
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            try {
              await faceMeshRef.current.send({ image: videoRef.current });
            } catch (error) {
              console.error('Error sending frame to FaceMesh:', error);
            }
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      console.log('MediaPipe Camera started');

      console.log('Face tracking initialized:', {
        videoReady: !!videoRef.current,
        faceMeshReady: !!faceMeshRef.current,
        cameraReady: !!cameraRef.current,
        streamReady: !!stream
      });

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
    distractionStartTimeRef.current = null;
    frameCountRef.current = 0;

    setState({
      isTracking: false,
      focusLevel: 100,
      isFaceDetected: false,
      stream: null,
      distractionCount: 0,
      attentionMetrics: {
        eyeOpenness: 0,
        headPoseScore: 0,
        isDistracted: false,
        distractionDuration: 0,
      },
    });

    toast.info('Focus tracking stopped');
  };

  // Track window focus/blur events
  useEffect(() => {
    const handleFocus = () => setWindowFocused(true);
    const handleBlur = () => setWindowFocused(false);
    const handleVisibilityChange = () => {
      setWindowFocused(!document.hidden);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
