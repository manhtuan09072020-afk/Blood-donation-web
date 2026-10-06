// Design tokens dùng chung cho Ant Design
export const BRAND = {
  primary: '#c8102e',
  primaryDark: '#9f0d24',
  primarySoft: '#fdecee',
  ink: '#0f172a',
  muted: '#64748b',
  bg: '#f4f6fb',
  success: '#16a34a',
  warning: '#f59e0b',
  info: '#2563eb'
};

export const theme = {
  token: {
    colorPrimary: BRAND.primary,
    colorInfo: BRAND.info,
    colorSuccess: BRAND.success,
    colorWarning: BRAND.warning,
    colorError: '#dc2626',
    colorTextBase: BRAND.ink,
    colorBgLayout: BRAND.bg,
    borderRadius: 10,
    borderRadiusLG: 14,
    fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    controlHeight: 38,
    boxShadowTertiary: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)'
  },
  components: {
    Layout: { siderBg: '#0f172a', headerBg: '#ffffff', bodyBg: BRAND.bg },
    Menu: {
      darkItemBg: '#0f172a',
      darkSubMenuItemBg: '#0b1222',
      darkItemSelectedBg: BRAND.primary,
      darkItemColor: 'rgba(226, 232, 240, 0.72)',
      darkGroupTitleColor: 'rgba(148, 163, 184, 0.7)',
      itemBorderRadius: 8,
      itemMarginInline: 10
    },
    Card: { headerFontSize: 15 },
    Table: { headerBg: '#f8fafc', headerColor: '#475569', rowHoverBg: '#fff7f8' },
    Button: { fontWeight: 600, primaryShadow: '0 4px 12px rgba(200, 16, 46, 0.22)' },
    Tabs: { titleFontSize: 14 },
    Statistic: { titleFontSize: 13 }
  }
};
