"use client";

import dynamic from "next/dynamic";

const MonkeyPet = dynamic(() => import("./MonkeyPet"), { ssr: false });

export default function MonkeyPetClient() {
  return <MonkeyPet />;
}
