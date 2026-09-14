export const metadata = {
  title: "deVino Studio",
  description: "Content studio for the deVino website.",
};

// Sanity Studio ships its own styling — this root layout is intentionally
// minimal and independent of the public site's (site)/[locale] layout.
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
