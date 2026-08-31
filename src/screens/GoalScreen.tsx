import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, Dim, Field, Title } from '../components';
import { formatDate, projectEta } from '../eta';
import { loadGoal, saveGoal } from '../storage';
import { colors, spacing } from '../theme';
import { Goal } from '../types';

export function GoalScreen() {
  const [aim, setAim] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('10');
  const [currentStep, setCurrentStep] = useState('');
  const [stepsTotal, setStepsTotal] = useState('10');
  const [stepsDone, setStepsDone] = useState('0');
  const [saved, setSaved] = useState<Goal | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadGoal().then((g) => {
      if (!g) return;
      setSaved(g);
      setAim(g.aim);
      setTargetDate(g.targetDate.slice(0, 10));
      setHoursPerWeek(String(g.hoursPerWeek));
      setCurrentStep(g.currentStep);
      setStepsTotal(String(g.stepsTotal));
      setStepsDone(String(g.stepsDone));
    });
  }, []);

  const onSave = async () => {
    const parsedDate = new Date(targetDate);
    if (!aim.trim()) {
      setNotice('Give the aim a name — the roasts need ammunition.');
      return;
    }
    if (isNaN(parsedDate.getTime())) {
      setNotice('Target date must be YYYY-MM-DD.');
      return;
    }
    const goal: Goal = {
      aim: aim.trim(),
      targetDate: parsedDate.toISOString(),
      hoursPerWeek: Math.max(parseFloat(hoursPerWeek) || 0, 0),
      currentStep: currentStep.trim(),
      stepsTotal: Math.max(parseInt(stepsTotal, 10) || 1, 1),
      stepsDone: Math.max(parseInt(stepsDone, 10) || 0, 0),
      createdAt: saved?.createdAt ?? new Date().toISOString(),
    };
    await saveGoal(goal);
    setSaved(goal);
    setNotice('Saved. The watcher will use this the next time it (re)starts.');
  };

  const eta = saved ? projectEta(saved) : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <Title>🎯 The aim</Title>
        <Field label='What are you going for?' value={aim} onChangeText={setAim} placeholder='Backend engineer role by December' />
        <Field label='Deadline (YYYY-MM-DD)' value={targetDate} onChangeText={setTargetDate} placeholder='2026-12-31' />
        <Field label='Hours per week you claim you will invest' value={hoursPerWeek} onChangeText={setHoursPerWeek} keyboardType='numeric' />
      </Card>

      <Card>
        <Title>🗺️ Roadmap (manual for now)</Title>
        <Dim>Phase 2 generates this with an LLM. For the spike, track it by hand — the numbers feed the ETA math the roasts use.</Dim>
        <View style={{ height: spacing.sm }} />
        <Field label='Current step' value={currentStep} onChangeText={setCurrentStep} placeholder='DDIA chapter 7' />
        <Field label='Total steps' value={stepsTotal} onChangeText={setStepsTotal} keyboardType='numeric' />
        <Field label='Steps done' value={stepsDone} onChangeText={setStepsDone} keyboardType='numeric' />
        <Button label='Save goal' onPress={onSave} />
        {notice ? <Text style={{ color: colors.warn, marginTop: spacing.sm, fontSize: 13 }}>{notice}</Text> : null}
      </Card>

      {saved && eta && (
        <Card>
          <Title>📅 The math, so far</Title>
          <Dim>
            {eta.daysToTarget >= 0
              ? `${eta.daysToTarget} days to your deadline.`
              : `${-eta.daysToTarget} days PAST your deadline.`}
          </Dim>
          <Text style={{ color: colors.text, fontSize: 15, marginTop: spacing.xs }}>
            Projected finish at current pace:{' '}
            <Text style={{ color: eta.slipDays > 0 || !eta.projectedDate ? colors.danger : colors.accent, fontWeight: '700' }}>
              {formatDate(eta.projectedDate)}
            </Text>
            {eta.slipDays > 0 ? `  (${eta.slipDays} days late)` : ''}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}
