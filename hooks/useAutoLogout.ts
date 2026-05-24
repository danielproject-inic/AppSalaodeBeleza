import { useEffect, useRef } from 'react';

export function useAutoLogout(onLogout: () => void, timeoutMinutes: number = 15, isActive: boolean = true) {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const lastActivityRef = useRef(Date.now());
  const lastTickRef = useRef(Date.now());
  const logoutCallbackRef = useRef(onLogout);

  useEffect(() => {
    logoutCallbackRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    if (!isActive) return;

    // Reset references when it becomes active
    lastActivityRef.current = Date.now();
    lastTickRef.current = Date.now();

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity, true);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('click', updateActivity);

    const intervalId = setInterval(() => {
      const now = Date.now();
      
      // Verifica se houve um "pulo" de tempo muito grande (ex: PC dormiu ou hibernou)
      // Um pulo maior que 30 segundos indica suspensão
      const timeSinceLastTick = now - lastTickRef.current;
      if (timeSinceLastTick > 30000) {
        logoutCallbackRef.current();
      }
      lastTickRef.current = now;

      // Verifica inatividade
      if (now - lastActivityRef.current > timeoutMs) {
        logoutCallbackRef.current();
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity, true);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('click', updateActivity);
      clearInterval(intervalId);
    };
  }, [isActive, timeoutMs]);
}
