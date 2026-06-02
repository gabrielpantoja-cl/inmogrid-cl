import { HomeIcon } from '@heroicons/react/24/solid';

export default function AcmeLogo() {
  return (
    <div
      className="flex items-center gap-2 select-none p-1"
      role="banner"
      aria-label="Logo de inmogrid.cl"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-sm">
        <HomeIcon className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <span className="text-base font-bold tracking-tight whitespace-nowrap">
        inmo<span className="text-primary">grid</span><span className="text-foreground/70 font-normal">.cl</span>
      </span>
    </div>
  );
}
