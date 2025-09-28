import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // npm i framer-motion

export default function AchievementToast({ achievement }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (achievement) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 4000);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [achievement]);

  if (!show || !achievement) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          <span className="text-xl">{achievement.icon}</span>
          <div>
            <div className="font-bold">{achievement.title}</div>
            <div className="text-xs">{achievement.description}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}