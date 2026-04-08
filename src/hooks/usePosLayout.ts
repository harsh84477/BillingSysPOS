import { useState, useEffect } from 'react';

export function usePosLayout() {
  const [desktopLayout, setDesktopLayout] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('pos_desktop_layout') as 'grid' | 'list') || 'grid';
  });

  const [mobileLayout, setMobileLayout] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('pos_mobile_layout') as 'grid' | 'list') || 'grid';
  });

  const [listDensity, setListDensity] = useState<'compact' | 'comfortable' | 'spacious'>(() => {
    return (localStorage.getItem('pos_list_density') as 'compact' | 'comfortable' | 'spacious') || 'comfortable';
  });

  useEffect(() => {
    localStorage.setItem('pos_desktop_layout', desktopLayout);
  }, [desktopLayout]);

  useEffect(() => {
    localStorage.setItem('pos_mobile_layout', mobileLayout);
  }, [mobileLayout]);

  useEffect(() => {
    localStorage.setItem('pos_list_density', listDensity);
  }, [listDensity]);

  return { desktopLayout, setDesktopLayout, mobileLayout, setMobileLayout, listDensity, setListDensity };
}
