"use client";

import Link from "next/link";
import Image from "next/image";

export default function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image
        src="/assets/lolo.png"
        alt="Logo Bassstival"
        width={80}
        height={80}
        className="rounded-md"
        priority
      />
      <span className="text-lg lg:text-xl">
        <span className="text-[#ff7a1a] text-lg lg:text-xl">BASS</span>
        <span className="text-[#ff5a5f] text-lg lg:text-xl">S&apos;TIVAL</span>
      </span>
    </Link>
  );
}
