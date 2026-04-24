"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";

type TrustedLogo = { name: string; src?: string };

export const TrustedLogos = () => {
  const items = useMemo<TrustedLogo[]>(
    () => [
      { name: "IMDADAT", src: "/logos/imdadat.png" },
      { name: "JASCO", src: "/logos/jasco.png" },
      { name: "JASCO PVC" },
    ],
    [],
  );

  const [missing, setMissing] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-10 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
      {items.map((item) => {
        const isMissing = !item.src || Boolean(missing[item.name]);
        return (
          <div
            key={item.name}
            className="h-12 w-[160px] sm:w-[180px] rounded-2xl border border-gray-200/60 bg-white px-4 flex items-center justify-center shadow-sm shadow-gray-900/5"
          >
            {isMissing ? (
              <span className="text-sm font-black tracking-[0.2em] text-gray-500 uppercase text-center">
                {item.name}
              </span>
            ) : (
              <div className="relative h-8 w-full">
                <Image
                  src={item.src}
                  alt={item.name}
                  fill
                  sizes="180px"
                  className="object-contain"
                  onError={() => setMissing((prev) => ({ ...prev, [item.name]: true }))}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

