import { useState } from 'react';

export function usePosLayout(settings?: any) {
  const [desktopLayout, setDesktopLayoutState] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('pos_desktop_layout') as 'grid' | 'list') || 'grid';
  });

  const [mobileLayout, setMobileLayoutState] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('pos_mobile_layout') as 'grid' | 'list') || 'grid';
  });

  const [listDensity, setListDensityState] = useState<'compact' | 'comfortable' | 'spacious'>(() => {
    return (localStorage.getItem('pos_list_density') as 'compact' | 'comfortable' | 'spacious') || 'comfortable';
  });

  const [desktopColumns, setDesktopColumnsState] = useState<number>(() => {
    const val = localStorage.getItem('pos_desktop_columns');
    return val ? parseInt(val, 10) : 0;
  });

  const [gridGap, setGridGapState] = useState<number>(() => {
    const val = localStorage.getItem('pos_grid_gap');
    return val ? parseInt(val, 10) : 0;
  });

  const [mobileColumns, setMobileColumnsState] = useState<number>(() => {
    const val = localStorage.getItem('pos_mobile_columns');
    return val ? parseInt(val, 10) : 0;
  });

  const [askQuantityFirst, setAskQuantityFirstState] = useState<boolean | null>(() => {
    const val = localStorage.getItem('pos_ask_quantity_first');
    return val !== null ? val === 'true' : null;
  });

  // Safe setter wrappers that also persist to local storage
  const setDesktopLayout = (val: 'grid' | 'list') => {
    setDesktopLayoutState(val);
    localStorage.setItem('pos_desktop_layout', val);
  };

  const setMobileLayout = (val: 'grid' | 'list') => {
    setMobileLayoutState(val);
    localStorage.setItem('pos_mobile_layout', val);
  };

  const setListDensity = (val: 'compact' | 'comfortable' | 'spacious') => {
    setListDensityState(val);
    localStorage.setItem('pos_list_density', val);
  };

  const setDesktopColumns = (val: number) => {
    setDesktopColumnsState(val);
    localStorage.setItem('pos_desktop_columns', String(val));
  };

  const setGridGap = (val: number) => {
    setGridGapState(val);
    localStorage.setItem('pos_grid_gap', String(val));
  };

  const setMobileColumns = (val: number) => {
    setMobileColumnsState(val);
    localStorage.setItem('pos_mobile_columns', String(val));
  };

  const setAskQuantityFirst = (val: boolean) => {
    setAskQuantityFirstState(val);
    localStorage.setItem('pos_ask_quantity_first', String(val));
  };

  // Resolve values against settings defaults
  const resolvedDesktopColumns = desktopColumns > 0 ? desktopColumns : (settings?.product_columns ?? 5);
  const resolvedGridGap = gridGap > 0 ? gridGap : (settings?.grid_gap ?? 8);
  const resolvedMobileColumns = mobileColumns > 0 ? mobileColumns : (settings?.mobile_product_columns ?? 3);
  
  const resolvedAskQuantityFirst = askQuantityFirst !== null
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
    askQuantityFirst: resolvedAskQuantityFirst, // return the resolved value directly for simpler state usage
    setAskQuantityFirst,
    resolvedDesktopColumns,
    resolvedGridGap,
    resolvedMobileColumns,
    resolvedAskQuantityFirst,
  };
}
