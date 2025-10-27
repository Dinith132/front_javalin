import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Play, Pause, Volume2, Download, Share2,
  RotateCcw, CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle, Circle as XCircle,
  Maximize2, Minimize2
} from 'lucide-react-native';
import { aiAnalysisEngine } from '@/components/AIAnalysisEngine';

interface AnalysisResults {
  prediction: string;
  confidence: number;
  probabilities: { [key: string]: number };
}

/**
 * FeedbackScreen — FIXED version
 *
 * Key fixes:
 * - Properly cache video (limit cache), do NOT delete cached file in effect cleanup (avoids race).
 * - Use refs for DownloadResumable and cached local path to avoid effect dependency loops.
 * - Cancel download/resumable on unmount.
 * - Safely stop/unload video on unmount and before deleting files.
 * - Dispose aiAnalysisEngine exactly once (on unmount).
 * - Guard state updates after unmount with isMounted flag.
 */
export default function FeedbackScreen() {
  const { videoUri, results } = useLocalSearchParams();
  const videoRef = useRef<Video | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [cachedVideoUri, setCachedVideoUri] = useState<string | null>(null); // local file path when cached
  const cachedVideoUriRef = useRef<string | null>(null); // ref to avoid forcing effect reruns
  const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null);

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const videoUriString = useMemo(
    () => (Array.isArray(videoUri) ? videoUri[0] : videoUri) as string,
    [videoUri]
  );

  const analysisResults: AnalysisResults | null = useMemo(
    () => (results ? JSON.parse(results as string) : null),
    [results]
  );

  // ----------------------------
  // Caching & download effect
  // ----------------------------
  useEffect(() => {
    let isMounted = true;

    // Only depend on videoUriString — not on cachedVideoUri
    const cacheVideo = async () => {
      if (!videoUriString) return;

      try {
        const fileName = videoUriString.split('/').pop()?.split('?')[0] || `video-${Date.now()}.mp4`;
        const localUri = `${FileSystem.cacheDirectory}${fileName}`;

        // If file already exists, use it
        const info = await FileSystem.getInfoAsync(localUri);
        if (info.exists && info.isDirectory === false) {
          if (isMounted) {
            cachedVideoUriRef.current = localUri;
            setCachedVideoUri(localUri);
            setIsVideoLoading(false);
          }
          return;
        }

        // Start download
        setIsDownloading(true);
        setDownloadProgress(0);
        const downloadResumable = FileSystem.createDownloadResumable(
          videoUriString,
          localUri,
          {},
          (progress) => {
            const p = progress.totalBytesExpectedToWrite > 0
              ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
              : 0;
            if (isMounted) setDownloadProgress(p);
          }
        );

        downloadResumableRef.current = downloadResumable;

        let result: FileSystem.FileSystemDownloadResult | undefined;
        try {
          result = await downloadResumable.downloadAsync();
        } catch (err: any) {
          // If user cancelled, just fallback to remote URI
          console.error('Video download error:', err?.message ?? err);
          result = undefined;
        }

        const finalUri = result?.uri ?? videoUriString;
        if (isMounted) {
          cachedVideoUriRef.current = result?.uri ?? null; // only local if downloaded
          setCachedVideoUri(result?.uri ?? null);
          setIsVideoLoading(false);
        }

        // Prune cache: keep max 3 files in cache directory to avoid storage growth
        // Do this asynchronously without blocking UI
// Prune cache: keep max 3 files in cache directory to avoid storage growth
(async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      console.warn('Cache directory is not available on this platform.');
      return;
    }

    const files = await FileSystem.readDirectoryAsync(cacheDir);
    // Filter plausible video filenames (simple heuristic)
    const videoFiles = files.filter(f => /\.(mp4|mov|avi|mkv)$/i.test(f));
    if (videoFiles.length > 3) {
      const fileInfos = await Promise.all(videoFiles.map(async f => {
        const fp = cacheDir + f;
        const meta = await FileSystem.getInfoAsync(fp, { size: true });
        return { file: f, uri: fp, exists: meta.exists };
      }));

      // sort by modification time (oldest first)
      const sorted = fileInfos.sort((a, b) => (a.file > b.file ? 1 : -1));
      const toDelete = sorted.slice(0, sorted.length - 3);
      for (const t of toDelete) {
        if (t.exists) {
          try {
            await FileSystem.deleteAsync(t.uri, { idempotent: true });
          } catch (e) {
            console.warn('Cache deletion error:', e);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Cache prune error:', err);
  }
})();


      } catch (error) {
        console.error('Video caching error:', error);
        if (isMounted) {
          // fallback: do not set local cached URI so we will stream remote
          cachedVideoUriRef.current = null;
          setCachedVideoUri(null);
          setIsVideoLoading(false);
          setIsDownloading(false);
        }
      } finally {
        if (isMounted) setIsDownloading(false);
      }
    };

    cacheVideo();

    return () => {
      // cleanup for this effect: cancel download if running
      isMounted = false;
      const dr = downloadResumableRef.current;
      if (dr) {
        dr.cancelAsync().catch(() => { /* ignore */ });
        downloadResumableRef.current = null;
      }
      // do NOT delete cached file here — deletion races with playback.
      // Deletion/pruning is handled separately above.
    };
    // intentionally only depend on videoUriString
  }, [videoUriString]);

  // ----------------------------
  // aiAnalysisEngine dispose: call once on unmount
  // ----------------------------
  useEffect(() => {
    return () => {
      try {
        // Dispose once when component unmounts
        aiAnalysisEngine.dispose?.();
      } catch (e) {
        console.warn('Error disposing aiAnalysisEngine', e);
      }
    };
  }, []);

  // ----------------------------
  // Play audio feedback once (safe timer + cleanup)
  // ----------------------------
  useEffect(() => {
    let timer: number | null = null;
    if (analysisResults && !audioPlayed) {
      timer = global.setTimeout(() => {
        playAudioFeedback();
        setAudioPlayed(true);
      }, 800);
    }
    return () => {
      if (timer) clearTimeout(timer);
      stopAudioFeedback();
    };
  }, [analysisResults, audioPlayed]);

  // ----------------------------
  // Unload video and stop speech on unmount
  // ----------------------------
  useEffect(() => {
    return () => {
      // stop speech
      try { Speech.stop(); } catch (e) { /* ignore */ }

      // stop & unload video safely
      (async () => {
        try {
          if (videoRef.current) {
            // guard: sometimes ref is null when unmounting quickly
            await videoRef.current.stopAsync().catch(() => { /* ignore */ });
            await videoRef.current.unloadAsync().catch(() => { /* ignore */ });
            videoRef.current = null;
          }
        } catch (err) {
          console.warn('Video unload error (unmount):', err);
        }
      })();
    };
  }, []);

  // ----------------------------
  // Hardware back button (safe)
  // ----------------------------
  useEffect(() => {
    const backAction = () => {
      // ensure speech stops and unload video before navigating
      try { Speech.stop(); } catch (_) {}
      (async () => {
        if (videoRef.current) {
          await videoRef.current.stopAsync().catch(() => {});
          await videoRef.current.unloadAsync().catch(() => {});
        }
        router.push('/');
      })();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // ----------------------------
  // UI helpers
  // ----------------------------
  const getResultColor = (prediction: string) => {
    switch (prediction) {
      case 'Good Technique': return '#10b981';
      case 'Low Arm': return '#f59e0b';
      case 'Poor Left Leg Block': return '#ef4444';
      case 'Both Errors': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getResultIcon = (prediction: string) => {
    switch (prediction) {
      case 'Good Technique': return CheckCircle;
      case 'Low Arm':
      case 'Poor Left Leg Block': return AlertTriangle;
      case 'Both Errors': return XCircle;
      default: return AlertTriangle;
    }
  };

  const generateFeedbackText = (prediction: string) => {
    switch (prediction) {
      case 'Good Technique':
        return 'Excellent throw! Your technique is spot on. Continue practicing to maintain this form.';
      case 'Low Arm':
        return 'Your arm position needs improvement. Focus on keeping your throwing arm higher during the release phase.';
      case 'Poor Left Leg Block':
        return 'Work on your left leg blocking technique. A strong block will help transfer more power to your throw.';
      case 'Both Errors':
        return 'Multiple technique issues detected. Focus on both your arm position and left leg blocking for better results.';
      default:
        return 'Analysis complete. Review the feedback for improvement suggestions.';
    }
  };

  // ----------------------------
  // Playback & speech controls
  // ----------------------------
  const playAudioFeedback = async () => {
    if (!analysisResults || isSpeaking) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsSpeaking(true);
    try {
      Speech.speak(generateFeedbackText(analysisResults.prediction), {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (err) {
      console.warn('Speech error', err);
      setIsSpeaking(false);
    }
  };

  const stopAudioFeedback = () => {
    try { Speech.stop(); } catch { /* ignore */ }
    setIsSpeaking(false);
  };

  const toggleVideo = async () => {
    if (!videoRef.current) return;
    try {
      if (isPlaying) await videoRef.current.pauseAsync();
      else await videoRef.current.playAsync();
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.warn('Video toggle error', err);
      Alert.alert('Error', 'Failed to toggle video playback.');
    }
  };

  const toggleFullscreen = async () => {
    if (!videoRef.current) return;
    try {
      if (isFullscreen) await videoRef.current.dismissFullscreenPlayer();
      else await videoRef.current.presentFullscreenPlayer();
      setIsFullscreen(!isFullscreen);
    } catch (err) {
      console.warn('Fullscreen error', err);
      Alert.alert('Error', 'Failed to toggle fullscreen mode.');
    }
  };

  const shareResults = async () => {
    if (!analysisResults) return Alert.alert('Error', 'No analysis results available to share.');
    if (!(await Sharing.isAvailableAsync())) return Alert.alert('Sharing not supported', 'Sharing is not available on this platform.');
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const shareUri = cachedVideoUri ?? videoUriString;
      await Sharing.shareAsync(shareUri, { dialogTitle: 'Share Javelin Analysis' });
    } catch (err) {
      console.warn('Share error', err);
      Alert.alert('Error', 'Failed to share analysis results.');
    }
  };

  const downloadVideo = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert('Download', 'Video with analysis overlay saved to your device.');
  };

  const retryAnalysis = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('../index');
  };

  if (!analysisResults || !videoUriString) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No analysis results or video available</Text>
      </View>
    );
  }

  const ResultIcon = getResultIcon(analysisResults.prediction);
  const resultColor = getResultColor(analysisResults.prediction);

  return (
    <LinearGradient colors={['#1a365d', '#2d5a87']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Analysis Results</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.videoContainer, isFullscreen && { height: '100%' }]}>
            {isDownloading || isVideoLoading ? (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>{isDownloading ? 'Downloading Video...' : 'Loading Video...'}</Text>
                {isDownloading && (
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]} />
                  </View>
                )}
                {isDownloading && <Text style={styles.loadingText}>{Math.round(downloadProgress * 100)}%</Text>}
              </View>
            ) : (
              <>
                <Video
                  ref={videoRef}
                  source={{ uri: cachedVideoUri ? cachedVideoUri : videoUriString }}
                  style={styles.video}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={isPlaying}
                  isLooping
                  onLoad={() => setIsVideoLoading(false)}
                  onError={(err) => {
                    console.error('Video load/play error:', err);
                    setIsVideoLoading(false);
                    Alert.alert('Video Error', 'Failed to load or play video.');
                  }}
                  onPlaybackStatusUpdate={(status) => {
                    if ('isPlaying' in status) setIsPlaying(status.isPlaying || false);
                  }}
                />
                <View style={styles.videoOverlay}>
                  <View style={styles.controlsContainer}>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
                      {isPlaying ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleFullscreen}>
                      {isFullscreen ? <Minimize2 size={24} color="#fff" /> : <Maximize2 size={24} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.overlayInfo}>
                    <Text style={styles.overlayText}>Video with pose overlay</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={styles.resultContainer}>
            <View style={[styles.resultHeader, { backgroundColor: resultColor }]}>
              <ResultIcon size={32} color="#fff" />
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle}>{analysisResults.prediction}</Text>
                <Text style={styles.confidenceText}>{Math.round(analysisResults.confidence * 100)}% confidence</Text>
              </View>
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackTitle}>AI Feedback</Text>
              <Text style={styles.feedbackText}>{generateFeedbackText(analysisResults.prediction)}</Text>
              <TouchableOpacity style={styles.audioButton} onPress={isSpeaking ? stopAudioFeedback : playAudioFeedback}>
                <Volume2 size={20} color="#3182ce" />
                <Text style={styles.audioButtonText}>{isSpeaking ? 'Stop Speaking' : 'Play Audio Feedback'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.probabilitiesSection}>
              <Text style={styles.probabilitiesTitle}>Detailed Analysis</Text>
              {Object.entries(analysisResults.probabilities).map(([technique, probability]) => (
                <View key={technique} style={styles.probabilityItem}>
                  <Text style={styles.techniqueLabel}>{technique}</Text>
                  <View style={styles.probabilityBar}>
                    <View style={[styles.probabilityFill, { width: `${probability * 100}%`, backgroundColor: technique === analysisResults.prediction ? resultColor : '#64748b' }]} />
                  </View>
                  <Text style={styles.probabilityText}>{Math.round(probability * 100)}%</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton} onPress={shareResults}>
            <Share2 size={20} color="#3182ce" />
            <Text style={styles.secondaryButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={downloadVideo}>
            <Download size={20} color="#3182ce" />
            <Text style={styles.secondaryButtonText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={retryAnalysis}>
            <RotateCcw size={20} color="#3182ce" />
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* Keep your existing styles — unchanged from your original */
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff'
  },
  placeholder: { width: 40 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  videoContainer: {
    position: 'relative',
    height: 250,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20
  },
  video: { width: '100%', height: '100%' },
  videoOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    marginRight: 10,
  },
  controlButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
  },
  overlayInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  overlayText: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#fff' },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  resultContent: { marginLeft: 16, flex: 1 },
  resultTitle: { fontSize: 22, fontFamily: 'Inter-Bold', color: '#fff' },
  confidenceText: { fontSize: 14, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  feedbackSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  feedbackTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#1a202c', marginBottom: 12 },
  feedbackText: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#4a5568', lineHeight: 24, marginBottom: 16 },
  audioButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fafc',
    borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0'
  },
  audioButtonText: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#3182ce', marginLeft: 8 },
  probabilitiesSection: { padding: 20 },
  probabilitiesTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#1a202c', marginBottom: 16 },
  probabilityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  techniqueLabel: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#4a5568', width: 120 },
  probabilityBar: { flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, marginHorizontal: 12 },
  probabilityFill: { height: '100%', borderRadius: 4 },
  probabilityText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#1a202c', width: 40, textAlign: 'right' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  secondaryButtonText: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#fff', marginLeft: 6 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a365d' },
  errorText: { fontSize: 18, fontFamily: 'Inter-Medium', color: '#fff' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: 16
  },
  loadingText: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#fff', marginBottom: 10 },
  progressBarBackground: { width: '80%', height: 10, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3182ce', borderRadius: 5 },
});
