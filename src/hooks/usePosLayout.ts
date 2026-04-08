import { useState, useEffect } from 'react';

export function usePosLayout() {
  const [desktopLayout, setDesktopLayout] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('pos_desktop_layout') as 'grid' | 'list') || 'grid';
  });

  const [mobileLayout, setMobileLayout] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('pos_mobile_layout') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('pos_desktop_layout', desktopLayout);
  }, [desktopLayout]);

  useEffect(() => {
    localStorage.setItem('pos_mobile_layout', mobileLayout);
  }, [mobileLayout]);

  return { desktopLayout, setDesktopLayout, mobileLayout, setMobileLayout };
}
