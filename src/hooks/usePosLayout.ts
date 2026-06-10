import { useState, useEffect } from 'react';

export function usePosLayout(settings?: any) {
  const [desktopLayout, setDesktopLayout] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('pos_desktop_layout') as 'grid' | 'list') || 'grid';
  });

  const [mobileLayout, setMobileLayout] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('pos_mobile_layout') as 'grid' | 'list') || 'grid';
  });

  const [listDensity, setListDensity] = useState<'compact' | 'comfortable' | 'spacious'>(() => {
    return (localStorage.getItem('pos_list_density') as 'compact' | 'comfortable' | 'spacious') || 'comfortable';
  });

  const [desktopColumns, setDesktopColumns] = useState<number>(() => {
    const val = localStorage.getItem('pos_desktop_columns');
    return val ? parseInt(val, 10) : 0; // 0 means use default
  });

  const [gridGap, setGridGap] = useState<number>(() => {
    const val = localStorage.getItem('pos_grid_gap');
    return val ? parseInt(val, 10) : 0; // 0 means use default
  });

  const [mobileColumns, setMobileColumns] = useState<number>(() => {
    const val = localStorage.getItem('pos_mobile_columns');
    return val ? parseInt(val, 10) : 0; // 0 means use default
  });

  const [askQuantityFirst, setAskQuantityFirst] = useState<boolean>(() => {
    const val = localStorage.getItem('pos_ask_quantity_first');
    return val === 'true';
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

  useEffect(() => {
    localStorage.setItem('pos_desktop_columns', String(desktopColumns));
  }, [desktopColumns]);

  useEffect(() => {
    localStorage.setItem('pos_grid_gap', String(gridGap));
  }, [gridGap]);

  useEffect(() => {
    localStorage.setItem('pos_mobile_columns', String(mobileColumns));
  }, [mobileColumns]);

  useEffect(() => {
    localStorage.setItem('pos_ask_quantity_first', String(askQuantityFirst));
  }, [askQuantityFirst]);

  // Resolve values against settings defaults
  const resolvedDesktopColumns = desktopColumns > 0 ? desktopColumns : (settings?.product_columns ?? 5);
  const resolvedGridGap = gridGap > 0 ? gridGap : (settings?.grid_gap ?? 8);
  const resolvedMobileColumns = mobileColumns > 0 ? mobileColumns : (settings?.mobile_product_columns ?? 3);
  
  const resolvedAskQuantityFirst = localStorage.getItem('pos_ask_quantity_first') !== null
    ? askQuantityFirst
    : (settings?.ask_quantity_first ?? false);

  return {
    desktopLayout,
    setDesktopLayout,
    mobileLayout,
    setMobileLayout,
    listDensity,
    setListDensity,
    desktopColumns,
    setDesktopColumns,
    gridGap,
    setGridGap,
    mobileColumns,
    setMobileColumns,
    askQuantityFirst,
    setAskQuantityFirst,
    resolvedDesktopColumns,
    resolvedGridGap,
    resolvedMobileColumns,
    resolvedAskQuantityFirst,
  };
}
