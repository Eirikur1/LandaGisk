"use client";

import dynamic from "next/dynamic";
import monkeyDrop from "@/assets/lottie/PlainSwingingMonkey.json";

const Lottie = dynamic(() => import("lottie-react").then((m) => m.default), {
  ssr: false,
  loading: () => null,
});

/** Small desktop-only monkey drop anchored directly below the navbar. */
export default function NavBarMonkeyDrop({
  className = "fixed top-[60px] left-1/2 z-40 hidden -translate-x-1/2 md:block",
  sizeClassName = "h-24 w-24",
}: {
  className?: string;
  sizeClassName?: string;
}) {
  return (
    <div
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <Lottie
        animationData={monkeyDrop}
        loop
        autoplay
        className={sizeClassName}
      />
    </div>
  );
}
