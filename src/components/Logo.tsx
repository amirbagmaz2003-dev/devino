import Image from "next/image";
import blackLogo from "../../public/logos/devino-logo-black.png";
import whiteLogo from "../../public/logos/devino-logo-white.png";

interface LogoProps {
  className?: string;
  /**
   * "auto" crossfades between both files as an ancestor `.site-header`
   * toggles `.is-light` (see globals.css) — used in the header, where the
   * background scrolls from dark to light. "black"/"white" pin a single
   * file for contexts with a fixed background, like the (always light)
   * footer.
   */
  variant?: "auto" | "black" | "white";
}

export default function Logo({ className = "", variant = "auto" }: LogoProps) {
  if (variant !== "auto") {
    return (
      <span className={`relative inline-block aspect-[962/324] ${className}`}>
        <Image
          src={variant === "black" ? blackLogo : whiteLogo}
          alt="DEVINO"
          fill
          className="object-contain"
          priority
        />
      </span>
    );
  }

  return (
    <span className={`relative inline-block aspect-[962/324] ${className}`}>
      <Image
        src={whiteLogo}
        alt="DEVINO"
        fill
        className="logo-crossfade logo-crossfade--white object-contain"
        priority
      />
      <Image
        src={blackLogo}
        alt=""
        aria-hidden
        fill
        className="logo-crossfade logo-crossfade--black object-contain"
      />
    </span>
  );
}
