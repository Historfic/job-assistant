// JobIQ mark — three bars, longest on top: the ranked shortlist the product
// produces. Kept as plain geometry so it stays crisp at favicon size.
//
// `boxed` wraps it on a dark rounded square for light backgrounds (social
// avatars, email); bare is for the app's own dark surfaces.

export default function Logo({
  size = 24,
  boxed = false,
  className = '',
}: {
  size?: number;
  boxed?: boolean;
  className?: string;
}) {
  const bars = (
    <>
      <rect x="9" y="13" width="30" height="6" rx="3" fill="#ffffff" />
      <rect x="9" y="24" width="21" height="6" rx="3" fill="#6b9bff" />
      <rect x="9" y="35" width="13" height="6" rx="3" fill="#3b4a6b" />
    </>
  );

  if (!boxed) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="JobIQ" className={className}>
        {bars}
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="JobIQ" className={className}>
      <rect width="48" height="48" rx="11" fill="#0a0a0f" />
      {bars}
    </svg>
  );
}
