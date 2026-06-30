'use client'

import Link from 'next/link'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'

const spring = { type: 'spring' as const, stiffness: 420, damping: 22, mass: 0.8 }

const variants = {
  primary:
    'bg-gradient-to-b from-[#0a7cff] to-[#0052cc] text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40',
  secondary:
    'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20',
  ghost: 'text-white/70 hover:text-white hover:bg-white/5',
  outline:
    'bg-transparent text-white border border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5',
}

const sizes = {
  sm: 'text-sm px-4 py-2 rounded-lg',
  md: 'text-sm font-semibold px-5 py-2.5 rounded-xl',
  lg: 'text-base font-bold px-8 py-4 rounded-xl',
}

type Variant = keyof typeof variants
type Size = keyof typeof sizes

type BaseProps = {
  children: ReactNode
  variant?: Variant
  size?: Size
  className?: string
  disabled?: boolean
}

type ButtonProps = BaseProps &
  Omit<HTMLMotionProps<'button'>, 'children'> & {
    href?: undefined
  }

type LinkProps = BaseProps &
  Omit<HTMLMotionProps<'a'>, 'children' | 'disabled'> & {
    href: string
  }

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

const MotionLink = motion.create(Link)

export const SpringButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps | LinkProps>(
  function SpringButton(props, ref) {
    const {
      children,
      variant = 'primary',
      size = 'md',
      className,
      disabled = false,
      href,
      ...rest
    } = props

    const classes = cn(
      'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200',
      variants[variant],
      sizes[size],
      disabled && 'opacity-50 pointer-events-none',
      className
    )

    const motionProps = {
      whileHover: disabled ? undefined : { scale: 1.04, y: -1 },
      whileTap: disabled ? undefined : { scale: 0.94, y: 0 },
      transition: spring,
    }

    if (href) {
      return (
        <MotionLink
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...motionProps}
          {...(rest as HTMLMotionProps<'a'>)}
        >
          {children}
        </MotionLink>
      )
    }

    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        disabled={disabled}
        className={classes}
        {...motionProps}
        {...(rest as HTMLMotionProps<'button'>)}
      >
        {children}
      </motion.button>
    )
  }
)
