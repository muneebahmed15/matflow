'use client'

import { useId } from 'react'

const bodyGradient = {
  top: '#eef1f6',
  bottom: '#9aa3b2',
}

const blueGradient = {
  start: '#5eb3ff',
  end: '#0a7cff',
}

export default function Logo({ size = 28 }: { size?: number }) {
  const uid = useId().replace(/:/g, '')
  const simplified = size < 36

  const bodyGradId = `logoBody-${uid}${simplified ? '-sm' : ''}`
  const blueGradId = `logoBlue-${uid}${simplified ? '-sm' : ''}`

  if (simplified) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={bodyGradient.top} />
            <stop offset="1" stopColor={bodyGradient.bottom} />
          </linearGradient>
          <linearGradient id={blueGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={blueGradient.start} />
            <stop offset="1" stopColor={blueGradient.end} />
          </linearGradient>
        </defs>
        <path
          d="M256 152 L343 152 L512 298 L681 152 L768 152 L768 642 L688 590 L688 292 L525 433 L512 444 L499 433 L336 292 L336 590 L256 642 Z"
          fill={`url(#${bodyGradId})`}
        />
        <path d="M160 765 L300 765 L406 642 L265 642 Z" fill={`url(#${blueGradId})`} />
        <path d="M724 765 L864 765 L759 642 L618 642 Z" fill={`url(#${blueGradId})`} />
        <path d="M425 660 L618 472 L618 572 L488 700 Z" fill={`url(#${blueGradId})`} />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bodyGradient.top} />
          <stop offset="1" stopColor={bodyGradient.bottom} />
        </linearGradient>
        <linearGradient id={blueGradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={blueGradient.start} />
          <stop offset="1" stopColor={blueGradient.end} />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M256 152 L343 152 L512 298 L681 152 L768 152 L768 642 L688 590 L688 292 L525 433 L512 444 L499 433 L336 292 L336 590 L256 642 Z"
          fill={`url(#${bodyGradId})`}
        />
        <path d="M433 392 L500 450 L462 486 L396 430 Z" fill={`url(#${bodyGradId})`} />
        <path d="M532 455 L592 455 L592 642 L532 642 Z" fill={`url(#${bodyGradId})`} />
        <path d="M160 765 L300 765 L406 642 L265 642 Z" fill={`url(#${blueGradId})`} />
        <path d="M724 765 L864 765 L759 642 L618 642 Z" fill={`url(#${blueGradId})`} />
        <path d="M425 660 L618 472 L618 572 L488 700 Z" fill={`url(#${blueGradId})`} />
        <path d="M345 565 L502 704" stroke="#ffffff" strokeWidth="12" strokeLinecap="square" fill="none" />
        <path d="M412 655 L640 427" stroke="#ffffff" strokeWidth="11" strokeLinecap="square" fill="none" />
        <path d="M300 640 L414 640" stroke="#ffffff" strokeWidth="10" fill="none" />
        <path d="M608 640 L722 640" stroke="#ffffff" strokeWidth="10" fill="none" />
      </g>
    </svg>
  )
}
