interface IconProps {
  className?: string
}

function base(className: string | undefined, strokeWidth: number) {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
}

/* 侧栏 / 顶栏胶囊：写日记 */
export function NavWriteIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M3 8h18M3 12h12M3 16h8" />
    </svg>
  )
}

/* 侧栏 / 顶栏胶囊：日记 */
export function NavDiaryIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

/* 侧栏 / 顶栏胶囊：AI 问答 */
export function NavChatIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12Z" />
    </svg>
  )
}

/* 页头图标：记录此刻 */
export function WriteHeadIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M4 20h16M7 20V4h10v16M10 8h4M10 12h4" />
    </svg>
  )
}

/* 页头图标：我的日记 */
export function DiaryHeadIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h4" />
    </svg>
  )
}

/* 页头图标：AI 问答（带三个小点） */
export function ChatHeadIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12Z" />
      <path d="M9 12h.01M13 12h.01M17 12h.01" />
    </svg>
  )
}

/* meta-bar：心情（心形） */
export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.6)}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

/* meta-bar：地点（图钉） */
export function PinIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.6)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

/* meta-bar：天气（太阳） */
export function SunIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.6)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

/* 下拉箭头 */
export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 2)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/* 加号 */
export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/* 搜索 */
export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

/* 关闭 × */
export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/* 抽屉浮球：目录菜单 */
export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  )
}

/* 删除（垃圾桶） */
export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  )
}

/* 发送（聊天输入） */
export function SendIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 2)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/* 提示里的省略图标（错误 / 空态感叹号） */
export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.6)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5h.01" />
    </svg>
  )
}

/* toast 勾选 */
export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 3.4)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/* 侧栏底部：设置（齿轮） */
export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.97z" />
    </svg>
  )
}

/* AI 连接：测试连接（闪电） */
export function BoltIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" />
    </svg>
  )
}

/* 设置里：恢复默认（旋转箭头） */
export function ResetIcon({ className }: IconProps) {
  return (
    <svg {...base(className, 1.8)}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
