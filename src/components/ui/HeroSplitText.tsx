"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { animate, splitText } from "animejs";

type HeroSplitTextProps = {
  text: string;
  as?: "h1" | "p";
  className?: string;
  style?: CSSProperties;
};

export default function HeroSplitText({
  text,
  as: Tag = "p",
  className,
  style,
}: HeroSplitTextProps) {
  const ref = useRef<HTMLHeadingElement | HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const split = splitText(el, { chars: true });

    split.addEffect(({ chars }: { chars: HTMLElement[] }) => {
      return animate(chars, {
        opacity: [{ from: 0, to: 1 }],
        y: [{ from: "0.6em", to: "0em" }],
        rotateX: [{ from: 40, to: 0 }],
        ease: "out(3)",
        duration: 700,
        delay: (_el: unknown, index: number) => index * 26,
      });
    });

    return () => {
      split.revert();
    };
  }, [text]);

  return (
    <Tag ref={ref} className={className} style={style}>
      {text}
    </Tag>
  );
}
