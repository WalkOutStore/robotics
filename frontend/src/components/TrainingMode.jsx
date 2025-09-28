
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

const trainingSteps = [
  {
    id: 1,
    title: "مرحباً بك في وضع التدريب!",
    instruction: "سأرشدك خلال أساسيات التحكم بالروبوت. اضغط على 'التالي' للبدء.",
    action: null,
  },
  {
    id: 2,
    title: "التحكم بالمفاصل (FK)",
    instruction: "استخدم أشرطة التمرير في لوحة 'التحكم اليدوي (FK)' لتغيير زوايا المفاصل. لاحظ كيف يتغير الروبوت في العارض ثلاثي الأبعاد.",
    action: "highlight_joint_control",
  },
  {
    id: 3,
    title: "الوضعية المنزلية",
    instruction: "اضغط على زر 'الوضعية المنزلية' في لوحة 'التحكم اليدوي (FK)' لإعادة الروبوت إلى وضعه الافتراضي.",
    action: "highlight_home_button",
  },
  {
    id: 4,
    title: "الحركة العكسية (IK)",
    instruction: "في لوحة 'تخطيط المسار'، حاول إدخال إحداثيات XYZ في حقل 'الوضعية المستهدفة' ثم اضغط على 'تطبيق IK'.",
    action: "highlight_path_planning_ik",
  },
  {
    id: 5,
    title: "حساب مساحة العمل",
    instruction: "اضغط على زر 'حساب مساحة العمل' في لوحة 'معلومات الروبوت' لتصور النطاق الذي يمكن للروبوت الوصول إليه.",
    action: "highlight_workspace_button",
  },
  {
    id: 6,
    title: "أوامر الصوت",
    instruction: "اضغط على أيقونة الميكروفون في الزاوية السفلية اليسرى وحاول قول 'الوضعية المنزلية' أو 'طبق الحركة الأمامية'.",
    action: "highlight_voice_command",
  },
  {
    id: 7,
    title: "أنت جاهز!",
    instruction: "لقد أكملت وضع التدريب الأساسي. استمر في الاستكشاف وتجربة الروبوت!",
    action: null,
  },
];

export function TrainingMode({ onStart, onEnd, onHighlight }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [trainingActive, setTrainingActive] = useState(false);

  const startTraining = useCallback(() => {
    setTrainingActive(true);
    setCurrentStep(0);
    onStart && onStart();
    toast.info("بدء وضع التدريب.");
  }, [onStart]);

  const nextStep = useCallback(() => {
    if (currentStep < trainingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTraining();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const endTraining = useCallback(() => {
    setTrainingActive(false);
    setCurrentStep(0);
    onEnd && onEnd();
    toast.info("إنهاء وضع التدريب.");
  }, [onEnd]);

  useEffect(() => {
    if (trainingActive && trainingSteps[currentStep]?.action) {
      onHighlight && onHighlight(trainingSteps[currentStep].action);
    } else {
      onHighlight && onHighlight(null); // Clear highlight
    }
  }, [trainingActive, currentStep, onHighlight]);

  if (!trainingActive) {
    return (
      <Button onClick={startTraining} className="w-full">
        بدء وضع التدريب
      </Button>
    );
  }

  const step = trainingSteps[currentStep];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>{step.instruction}</p>
        <div className="flex justify-between">
          <Button onClick={prevStep} disabled={currentStep === 0}>
            السابق
          </Button>
          <Button onClick={nextStep}>
            {currentStep === trainingSteps.length - 1 ? "إنهاء" : "التالي"}
          </Button>
        </div>
        <Button variant="outline" onClick={endTraining} className="w-full mt-2">
          الخروج من التدريب
        </Button>
      </CardContent>
    </Card>
  );
}

