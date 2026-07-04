import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
};

function isSupabaseStorageUrl(src: string): boolean {
  try {
    return new URL(src).hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

export default function PublicGymImage({
  src,
  alt,
  className,
  width = 80,
  height = 80,
  fill,
  priority,
  sizes,
}: Props) {
  const unoptimized = !isSupabaseStorageUrl(src);

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes ?? '100vw'}
        priority={priority}
        unoptimized={unoptimized}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={unoptimized}
    />
  );
}
