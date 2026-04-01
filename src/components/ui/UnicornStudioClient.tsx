"use client";

import dynamic from "next/dynamic";

const UnicornStudioEmbed = dynamic(() => import("./UnicornStudioEmbed"), { ssr: false });

interface Props {
  projectId: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function UnicornStudioClient(props: Props) {
  return <UnicornStudioEmbed {...props} />;
}
