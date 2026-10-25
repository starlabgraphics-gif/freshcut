// Minimal stroke icon set (lucide-style) so we ship zero icon deps.
import React from 'react';

const I = ({ children, size = 18, className = '', strokeWidth = 1.9 }) => (
  <svg
    viewBox="0 0 24 24" width={size} height={size} className={className}
    fill="none" stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconScissors = (p) => (
  <I {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88" /><path d="M14.47 14.48 20 20" /><path d="M8.12 8.12 12 12" /></I>
);
export const IconMap = (p) => (
  <I {...p}><path d="M14.1 5.6 9 3 3.3 5.4A1 1 0 0 0 3 6.3v13.2c0 .5.4.9.9.9l.4-.1L10 18l5.1 2.6 5.7-2.4a1 1 0 0 0 .7-.9V4.1a1 1 0 0 0-1.3-.9z" /><path d="M10 3.6V18" /><path d="M15 5.5v14.5" /></I>
);
export const IconPin = (p) => (
  <I {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></I>
);
export const IconQueue = (p) => (
  <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></I>
);
export const IconClock = (p) => (
  <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>
);
export const IconBell = (p) => (
  <I {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></I>
);
export const IconUser = (p) => (
  <I {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></I>
);
export const IconStore = (p) => (
  <I {...p}><path d="m2 7 4.41-4.35A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.65L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63A2.7 2.7 0 0 1 17 12a2.7 2.7 0 0 1-1.41.37A2.7 2.7 0 0 1 14 12a2.7 2.7 0 0 1-1.41.37A2.7 2.7 0 0 1 11.18 12 2.7 2.7 0 0 1 9.77 12.37 2.7 2.7 0 0 1 8.36 12 2.7 2.7 0 0 1 6.95 12.37 2.7 2.7 0 0 1 5.54 12 2.7 2.7 0 0 1 4 10V7" /></I>
);
export const IconChair = (p) => (
  <I {...p}><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" /><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z" /><path d="M5 18v2" /><path d="M19 18v2" /></I>
);
export const IconHistory = (p) => (
  <I {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></I>
);
export const IconLogout = (p) => (
  <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></I>
);
export const IconSearch = (p) => (
  <I {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></I>
);
export const IconX = (p) => <I {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></I>;
export const IconCheck = (p) => <I {...p}><path d="M20 6 9 17l-5-5" /></I>;
export const IconPlus = (p) => <I {...p}><path d="M5 12h14" /><path d="M12 5v14" /></I>;
export const IconBolt = (p) => <I {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></I>;
export const IconMenu = (p) => <I {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></I>;
export const IconPhone = (p) => (
  <I {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></I>
);
export const IconTrash = (p) => (
  <I {...p}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></I>
);
export const IconEdit = (p) => (
  <I {...p}><path d="M21.17 6.83a2.83 2.83 0 0 0-4-4L3.5 16.5 2 22l5.5-1.5Z" /><path d="m15 5 4 4" /></I>
);
export const IconGrid = (p) => (
  <I {...p}><rect width="7" height="7" x="3" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="14" rx="1.5" /><rect width="7" height="7" x="3" y="14" rx="1.5" /></I>
);
export const IconWalk = (p) => (
  <I {...p}><circle cx="13" cy="4" r="2" /><path d="m13.5 22-1.5-6-3 3-1 3" /><path d="m11 8-3.5 2L9 13.5 11 15l2 1 2.5 6" /><path d="m17 9-2.5-1.5" /></I>
);
export const IconPower = (p) => <I {...p}><path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" /><path d="M12 2v9" /></I>;
export const IconRazor = (p) => (
  <I {...p}><path d="M20 8 8 20l-4-4L16 4Z" /><path d="m10 10 4 4" /><path d="M14 6l4 4" /><path d="m16 4 1.5-1.5a2.1 2.1 0 0 1 3 3L19 7" /></I>
);
export const IconSparkle = (p) => (
  <I {...p}><path d="M12 3v3m0 12v3M5 12H2m20 0h-3M7.05 7.05 4.93 4.93m14.14 14.14-2.12-2.12m0-9.9 2.12-2.12M4.93 19.07l2.12-2.12" /></I>
);
