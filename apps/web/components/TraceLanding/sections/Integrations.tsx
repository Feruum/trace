import type { ReactNode } from 'react'
import { cn } from '@lib/utils'
import { ArrowRightIcon, DiscordIcon, GitHubIcon } from '../icons'

/* ---------- Brand icon components ---------- */

function YouTubeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
      />
      <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FigmaIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="#F24E1E"
        d="M8 24c2.208 0 4-1.79 4-4v-4H8c-2.208 0-4 1.79-4 4s1.792 4 4 4z"
      />
      <path
        fill="#A259FF"
        d="M4 12c0-2.21 1.792-4 4-4h4v8H8c-2.208 0-4-1.79-4-4z"
      />
      <path
        fill="#0ACF83"
        d="M4 4c0-2.21 1.792-4 4-4h4v8H8C5.792 8 4 6.21 4 4z"
      />
      <path
        fill="#1ABCFE"
        d="M12 0h4c2.208 0 4 1.79 4 4s-1.792 4-4 4h-4V0z"
      />
      <path
        fill="#FF7262"
        d="M20 12c0 2.21-1.792 4-4 4s-4-1.79-4-4 1.792-4 4-4 4 1.79 4 4z"
      />
    </svg>
  );
}

function LoomIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#625DF5" />
      <path fill="#fff" d="M10 8.5v7l6-3.5z" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        fill="#E01E5A"
        d="M5.04 15.165a2.135 2.135 0 0 1-2.13 2.13H2.91a2.135 2.135 0 0 1 0-4.26h2.13v2.13zm1.08 0a2.135 2.135 0 0 1 4.26 0v5.34a2.135 2.135 0 0 1-4.26 0v-5.34z"
      />
      <path
        fill="#36C5F0"
        d="M8.835 5.04a2.135 2.135 0 0 1-2.13 2.13H4.57a2.135 2.135 0 0 1 0-4.26h2.13a2.135 2.135 0 0 1 2.135 2.13zm0 1.08a2.135 2.135 0 0 1 4.26 0v2.14a2.135 2.135 0 0 1-4.26 0V6.12z"
      />
      <path
        fill="#2EB67D"
        d="M18.96 8.835a2.135 2.135 0 0 1 2.13-2.13h.01a2.135 2.135 0 0 1 0 4.26h-2.14v-2.13zm-1.08 0a2.135 2.135 0 0 1-4.26 0V3.495a2.135 2.135 0 0 1 4.26 0v5.34z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 18.96a2.135 2.135 0 0 1 2.13-2.13h2.14a2.135 2.135 0 0 1 0 4.26h-2.14a2.135 2.135 0 0 1-2.13-2.13zm0-1.08a2.135 2.135 0 0 1-4.26 0v-2.14a2.135 2.135 0 0 1 4.26 0v2.14z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/* ---------- Integration data ---------- */

type Integration = {
  name: string;
  /** Tailwind positioning classes (absolute) */
  position: string;
  /** float-N keyframe name */
  float: string;
  /** animation duration */
  duration: string;
  /** animation delay */
  delay: string;
  /** icon node rendered inside the card */
  icon: ReactNode;
  /** hidden on mobile to reduce clutter */
  mobileHidden?: boolean;
};

const integrations: Integration[] = [
  {
    name: "YouTube",
    position: "top-[10%] left-[6%]",
    float: "float-0",
    duration: "5s",
    delay: "0s",
    icon: <YouTubeIcon />,
  },
  {
    name: "Vimeo",
    position: "top-[14%] right-[8%]",
    float: "float-1",
    duration: "4s",
    delay: "0.5s",
    icon: (
      <span className="text-lg font-bold text-[#1AB7EA]">V</span>
    ),
    mobileHidden: true,
  },
  {
    name: "Figma",
    position: "top-[30%] left-[22%]",
    float: "float-2",
    duration: "6s",
    delay: "1s",
    icon: <FigmaIcon />,
    mobileHidden: true,
  },
  {
    name: "Loom",
    position: "top-[26%] right-[24%]",
    float: "float-3",
    duration: "5s",
    delay: "0.3s",
    icon: <LoomIcon />,
    mobileHidden: true,
  },
  {
    name: "GitHub",
    position: "top-[50%] left-[3%]",
    float: "float-4",
    duration: "4s",
    delay: "0.8s",
    icon: <GitHubIcon size={24} className="text-black" />,
  },
  {
    name: "Stripe",
    position: "top-[52%] right-[4%]",
    float: "float-5",
    duration: "6s",
    delay: "0.2s",
    icon: (
      <span className="text-lg font-bold text-[#635BFF]">S</span>
    ),
  },
  {
    name: "Discord",
    position: "bottom-[26%] left-[20%]",
    float: "float-6",
    duration: "5s",
    delay: "1.2s",
    icon: <DiscordIcon size={24} className="text-[#5865F2]" />,
    mobileHidden: true,
  },
  {
    name: "Notion",
    position: "bottom-[22%] right-[22%]",
    float: "float-7",
    duration: "4s",
    delay: "0.6s",
    icon: (
      <span className="text-lg font-bold text-black">N</span>
    ),
    mobileHidden: true,
  },
  {
    name: "Slack",
    position: "bottom-[10%] left-[8%]",
    float: "float-8",
    duration: "6s",
    delay: "0.4s",
    icon: <SlackIcon />,
  },
  {
    name: "Google",
    position: "bottom-[14%] right-[6%]",
    float: "float-9",
    duration: "5s",
    delay: "0.9s",
    icon: <GoogleIcon />,
  },
];

/* ---------- Section component ---------- */

export function Integrations() {
  return <section className="px-6 md:px-12 lg:px-20"><div className="relative max-w-7xl mx-auto rounded-2xl nice-shadow overflow-hidden bg-white"><div className="relative min-h-[420px] md:min-h-[520px] flex items-center justify-center px-6 py-16 md:py-24">{integrations.map((item) => <div key={item.name} className={cn('absolute z-0 flex items-center justify-center rounded-2xl bg-white shadow-md border border-black/5 w-12 h-12 md:w-14 md:h-14', item.position, item.mobileHidden && 'hidden md:flex')} style={{ animation: `${item.float} ${item.duration} ease-in-out ${item.delay} infinite` }} aria-hidden="true">{item.icon}</div>)}<div className="relative z-10 flex flex-col items-center text-center max-w-md"><h2 className="text-3xl md:text-4xl font-bold tracking-tight text-black">Источники, которым можно задать вопрос</h2><p className="mt-4 text-base md:text-lg text-black/60">Wikidata, Wikimedia Commons, Openverse и другие открытые провайдеры.</p><a href="/trace#sources" className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black/90">Посмотреть источники<ArrowRightIcon size={16} /></a></div></div></div></section>
}
