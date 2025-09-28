
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

// Helper function to convert Arabic numbers to English numbers
const convertArabicNumbers = (str) => {
  const arabicMap = {'٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'};
  return str.replace(/[٠-٩]/g, (d) => arabicMap[d]);
};

export function VoiceCommand({ onJointChange, onHomeReturn, onApplyFK, onApplyIK, highlightedElement = null }) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error("Web Speech API is not supported by this browser.");
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const sr = new SpeechRecognition();
    sr.continuous = false;
    sr.interimResults = false;
    sr.lang = 'ar-SA'; // Arabic (Saudi Arabia)

    sr.onstart = () => {
      setIsListening(true);
      toast.info("Voice command listening started...", { duration: 1500 });
    };

    sr.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice command received:', transcript);
      processVoiceCommand(transcript);
    };

    sr.onerror = (event) => {
      setIsListening(false);
      console.error('Speech recognition error:', event.error);
      toast.error(`Voice command error: ${event.error}`);
    };

    sr.onend = () => {
      setIsListening(false);
      toast.info("Voice command listening stopped.", { duration: 1500 });
    };

    setRecognition(sr);

    return () => {
      sr.stop();
    };
  }, []);

  const processVoiceCommand = useCallback((command) => {
    const lowerCommand = convertArabicNumbers(command).toLowerCase();

    // Go Home command
    if (lowerCommand.includes('الوضعية المنزلية') || lowerCommand.includes('المنزل') || lowerCommand.includes('ارجع للبيت')) {
      onHomeReturn();
      toast.success("Robot returning to home position.");
      return;
    }

    // Apply FK command
    if (lowerCommand.includes('طبق الحركة الأمامية') || lowerCommand.includes('اف كي')) {
      onApplyFK(); // This will trigger FK calculation based on current joint angles
      toast.success("Applying Forward Kinematics.");
      return;
    }

    // Apply IK command
    if (lowerCommand.includes('طبق الحركة العكسية') || lowerCommand.includes('اي كي')) {
      onApplyIK(); // This will trigger IK calculation based on current end-effector pose
      toast.success("Applying Inverse Kinematics.");
      return;
    }

    // Joint control commands (e.g., "حرك المفصل الأول إلى 0.5 راديان")
    const jointMatch = lowerCommand.match(/(المفصل|مفصل)\s*(ال?([١-٧]))\s*(إلى|بـ|بمقدار)\s*([\d\.\-]+)/);
    if (jointMatch) {
      const jointIndex = parseInt(jointMatch[3]) - 1; // Joint 1-7 maps to index 0-6
      const value = parseFloat(jointMatch[5]);

      if (jointIndex >= 0 && jointIndex < 7 && !isNaN(value)) {
        // This assumes onJointChange can handle a specific joint update
        // For now, we'll just log and suggest a full jointAngles update
        toast.info(`Command: Move Joint ${jointIndex + 1} to ${value} radians.`, { duration: 2000 });
        // In a real scenario, you'd update the specific joint angle in the parent state
        // For now, we'll simulate by calling onJointChange with a placeholder or full array update
        // Example: onJointChange(jointIndex, value);
        // As onJointChange expects a full array, we'd need to get current angles, modify, and pass.
        // For simplicity, this example just logs.
      } else {
        toast.warning("Could not parse joint movement command.");
      }
      return;
    }

    toast.warning("Voice command not recognized.");
  }, [onHomeReturn, onApplyFK, onApplyIK, onJointChange]);

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleListening}
      disabled={!recognition}
      className={`fixed bottom-4 left-4 z-50 ${highlightedElement === 'highlight_voice_command' ? 'ring-4 ring-yellow-400' : ''}`}
    >
      {isListening ? (
        <MicOff className="h-[1.2rem] w-[1.2rem] text-red-500" />
      ) : (
        <Mic className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle Voice Command</span>
    </Button>
  );
}

