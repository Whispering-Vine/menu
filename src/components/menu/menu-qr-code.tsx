import React from "react";
import QRCode from "qr.js/lib/QRCode";

/** Match v11.15's error correction and mask; edited URLs still get a valid QR. */
export function MenuQrCode({
  value,
  size,
  className,
}: {
  value: string;
  size: number;
  className?: string;
}) {
  // QR error-correction M is represented by zero in qr.js.
  const code = new QRCode(-1, 0);
  code.addData(value);
  code.make();
  const referenceMasks: Record<string, number> = {
    "qr.wvwine.co/wsky": 1,
    "qr.wvwine.co/1": 3,
  };
  if (value in referenceMasks) code.makeImpl(false, referenceMasks[value]);
  const count = code.modules.length;
  const path = code.modules
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")),
    )
    .join("");
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      className={className}
      role="img"
      aria-label={`QR code: ${value}`}
    >
      <rect width={count} height={count} fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
}
