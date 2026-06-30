export default function Logo({ size = 28 }: { size?: number }) {
  // Below 36px the thin white belt-knot strokes don't survive rendering,
  // so we drop them and keep just the core M shape for small/icon sizes.
  const simplified = size < 36

  if (simplified) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 1024 1024">
        <defs>
          <linearGradient id="logoBlackGradSm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b2d30" />
            <stop offset="1" stopColor="#050607" />
          </linearGradient>
          <linearGradient id="logoBlueGradSm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0a7cff" />
            <stop offset="1" stopColor="#0047c8" />
          </linearGradient>
        </defs>
        <path d="M256 152 L343 152 L512 298 L681 152 L768 152 L768 642 L688 590 L688 292 L525 433 L512 444 L499 433 L336 292 L336 590 L256 642 Z" fill="url(#logoBlackGradSm)" />
        <path d="M160 765 L300 765 L406 642 L265 642 Z" fill="url(#logoBlueGradSm)" />
        <path d="M724 765 L864 765 L759 642 L618 642 Z" fill="url(#logoBlueGradSm)" />
        <path d="M425 660 L618 472 L618 572 L488 700 Z" fill="url(#logoBlueGradSm)" />
      </svg>
    )
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="logoBlackGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2d30" />
          <stop offset="1" stopColor="#050607" />
        </linearGradient>
        <linearGradient id="logoBlueGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a7cff" />
          <stop offset="1" stopColor="#0047c8" />
        </linearGradient>
      </defs>
      <g>
        <path d="M256 152 L343 152 L512 298 L681 152 L768 152 L768 642 L688 590 L688 292 L525 433 L512 444 L499 433 L336 292 L336 590 L256 642 Z" fill="url(#logoBlackGrad)" />
        <path d="M433 392 L500 450 L462 486 L396 430 Z" fill="url(#logoBlackGrad)" />
        <path d="M532 455 L592 455 L592 642 L532 642 Z" fill="url(#logoBlackGrad)" />
        <path d="M160 765 L300 765 L406 642 L265 642 Z" fill="url(#logoBlueGrad)" />
        <path d="M724 765 L864 765 L759 642 L618 642 Z" fill="url(#logoBlueGrad)" />
        <path d="M425 660 L618 472 L618 572 L488 700 Z" fill="url(#logoBlueGrad)" />
        <path d="M345 565 L502 704" stroke="#ffffff" strokeWidth="12" strokeLinecap="square" fill="none" />
        <path d="M412 655 L640 427" stroke="#ffffff" strokeWidth="11" strokeLinecap="square" fill="none" />
        <path d="M300 640 L414 640" stroke="#ffffff" strokeWidth="10" fill="none" />
        <path d="M608 640 L722 640" stroke="#ffffff" strokeWidth="10" fill="none" />
      </g>
    </svg>
  )
}
